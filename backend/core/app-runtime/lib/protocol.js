'use strict'

// Wire protocol between an app runtime (server) and its callers (the Gateway,
// tests) -- see lib/runtime.js and lib/client.js.
//
// Transport: @hyperswarm/rpc (HyperDHT + protomux-rpc), one app runtime = one
// RPC server key. Everything on the wire is JSON in Buffers.
//
// Unary routes -- `app.invoke`
//   A regular @hyperswarm/rpc request/response.
//   request : { v:1, routeId, req:{ params, query, body, headers }, identity, actor }
//             `actor` is the signed-in operator's access token (or null): the
//             runtime sends it to the Kernel with the app's calls for that
//             request, and never hands it to app code.
//   response: { v:1, ok:true, result }
//          or { v:1, ok:false, status, code, message }
//   The responder never throws: every failure is an `ok:false` response, so a
//   rejected `rpc.request()` always means a transport failure.
//
// Stream routes -- `app.stream`
//   @hyperswarm/rpc 3.x has no streaming request API:
//   `request()` / `event()` are strictly one message in, one message out. So
//   streaming rides on the *same* authenticated HyperDHT connection through a
//   protomux channel (the mux the RPC layer already uses, reachable as
//   `rpc.mux` on both sides). Each stream uses a dedicated connection with a
//   single channel (protocol `app.stream`, null id), so closing either side
//   tears the whole thing down and there is no multiplexing state to leak.
//   The firewall that guards `app.invoke` guards the connection, hence the
//   stream, too.
//
//   Channel messages (fixed order, index = message type, raw buffers):
//     0 REQUEST client -> server  same JSON as an `app.invoke` request
//     1 HEAD    server -> client  JSON { statusCode, headers }
//     2 CHUNK   server -> client  raw body bytes (any number)
//     3 END     server -> client  empty; body complete
//     4 ERROR   server -> client  JSON { v:1, ok:false, status, code, message }
//                                 protocol-level failure before any HEAD
//                                 (unknown route, version mismatch, ...)
//   Either side closing the channel (or the connection dropping) aborts the
//   stream: the server's `raw` emits 'close', the client's Readable errors out
//   unless END was already received.
//
//   Backpressure: there is no credit or pause message, and the transport under
//   protomux (UDX) does not push back on a reader that stops reading, so the
//   client cannot slow the server down. Instead:
//   - client: each stream's unread bytes are capped (`maxStreamBufferBytes` on
//     createRuntimeClient, default 16 MiB). Past the cap the Readable is
//     destroyed with ERR_APP_STREAM_OVERFLOW and the channel and its connection
//     are closed, so the runtime stops sending (the handler's `raw` emits
//     'close'). A Gateway piping to a slow HTTP client therefore holds at most
//     that much per stream.
//   - server: `raw.write()` returns false while the connection's outgoing buffer
//     is full and `raw` emits 'drain' once it has flushed, so a handler that
//     honours write()'s return value (or uses stream.pipeline) does not queue
//     unbounded data in the runtime process.
//
// Errors: a message starting with `ERR_` is safe to return as-is; anything else
// is masked with a generic status text. Status is `err.statusCode` when it is
// an integer >= 400, else 403 for the Kernel refusing the app (spec.rbac does
// not grant its service account the call), 400 for any other `ERR_` error and
// 500 for anything else.

const http = require('http')

const PROTOCOL_VERSION = 1

const METHODS = Object.freeze({
  INVOKE: 'app.invoke',
  STREAM: 'app.stream'
})

// Index of each message on the `app.stream` channel.
const STREAM_MESSAGES = Object.freeze({
  REQUEST: 0,
  HEAD: 1,
  CHUNK: 2,
  END: 3,
  ERROR: 4
})

const ERR = Object.freeze({
  ROUTE_NOT_FOUND: 'ERR_APP_ROUTE_NOT_FOUND',
  PROTOCOL_VERSION: 'ERR_APP_PROTOCOL_VERSION',
  BAD_REQUEST: 'ERR_APP_BAD_REQUEST',
  ROUTE_IS_STREAM: 'ERR_APP_ROUTE_IS_STREAM',
  ROUTE_NOT_STREAM: 'ERR_APP_ROUTE_NOT_STREAM',
  REQUEST_FAILED: 'ERR_APP_REQUEST_FAILED',
  RUNTIME_UNAVAILABLE: 'ERR_APP_RUNTIME_UNAVAILABLE',
  RUNTIME_TIMEOUT: 'ERR_APP_RUNTIME_TIMEOUT',
  REQUEST_ABORTED: 'ERR_APP_REQUEST_ABORTED',
  STREAM_OVERFLOW: 'ERR_APP_STREAM_OVERFLOW'
})

function encode (obj) {
  return Buffer.from(JSON.stringify(obj))
}

function decode (buf) {
  return JSON.parse(Buffer.from(buf).toString('utf8'))
}

function buildRequest (routeId, req, identity, actor) {
  const r = req || {}
  return {
    v: PROTOCOL_VERSION,
    routeId,
    req: { params: r.params, query: r.query, body: r.body, headers: r.headers },
    identity: identity === undefined ? null : identity,
    actor: typeof actor === 'string' && actor ? actor : null
  }
}

function okResponse (result) {
  return { v: PROTOCOL_VERSION, ok: true, result }
}

function errorResponse (status, code, message) {
  return { v: PROTOCOL_VERSION, ok: false, status, code, message }
}

function isSafeError (err) {
  return !!(err && typeof err.message === 'string' && err.message.startsWith('ERR_'))
}

function _statusOf (err) {
  if (Number.isInteger(err && err.statusCode) && err.statusCode >= 400) return err.statusCode
  if (isSafeError(err) && err.message.startsWith('ERR_KERNEL_ACTION_FORBIDDEN')) return 403
  return isSafeError(err) ? 400 : 500
}

// What a handler/protocol error looks like on the wire (the `ok:false` shape).
// Safe (`ERR_*`) messages pass through; everything else becomes a generic
// status text so internals never leak to a caller.
function toErrorResponse (err) {
  const status = _statusOf(err)
  if (isSafeError(err)) {
    const m = /^ERR_[A-Z0-9_]+/.exec(err.message)
    return errorResponse(status, m ? m[0] : ERR.REQUEST_FAILED, err.message)
  }
  return errorResponse(status, ERR.REQUEST_FAILED, http.STATUS_CODES[status] || 'Bad Request')
}

// An error carrying an explicit status + code, for protocol-level failures.
function protocolError (status, code, detail) {
  const err = new Error(detail ? `${code}: ${detail}` : code)
  err.statusCode = status
  err.code = code
  return err
}

// Rebuild an Error from an `ok:false` response (client side).
// `remote` marks an error the runtime already handled (and logged, if it was a
// bug): the caller only relays it.
function fromErrorResponse (res) {
  const err = new Error(res.message || res.code || 'Bad Request')
  err.statusCode = Number.isInteger(res.status) ? res.status : 400
  err.code = res.code || ERR.REQUEST_FAILED
  err.remote = true
  return err
}

// Validates a decoded request envelope; returns null when fine, else an Error.
function checkRequest (msg) {
  if (!msg || typeof msg !== 'object') {
    return protocolError(400, ERR.BAD_REQUEST, 'request must be an object')
  }
  if (msg.v !== PROTOCOL_VERSION) {
    return protocolError(400, ERR.PROTOCOL_VERSION, `expected ${PROTOCOL_VERSION}, got ${msg.v}`)
  }
  if (typeof msg.routeId !== 'string' || !msg.routeId) {
    return protocolError(400, ERR.BAD_REQUEST, 'routeId is required')
  }
  if (msg.actor !== undefined && msg.actor !== null && (typeof msg.actor !== 'string' || !msg.actor || msg.actor.length > 8192)) {
    return protocolError(400, ERR.BAD_REQUEST, 'actor must be an access token')
  }
  return null
}

module.exports = {
  PROTOCOL_VERSION,
  METHODS,
  STREAM_MESSAGES,
  ERR,
  encode,
  decode,
  buildRequest,
  okResponse,
  errorResponse,
  toErrorResponse,
  fromErrorResponse,
  isSafeError,
  protocolError,
  checkRequest
}
