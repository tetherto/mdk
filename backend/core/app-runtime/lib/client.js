'use strict'

const crypto = require('crypto')
const { Readable, pipeline } = require('stream')
const debug = require('debug')('mdk:app:client')
const HyperswarmRPC = require('@hyperswarm/rpc')
const DHT = require('hyperdht')
const protocol = require('./protocol')

const { METHODS, STREAM_MESSAGES: MSG, ERR } = protocol

function _unavailable (routeId, cause) {
  const err = new Error(`${ERR.RUNTIME_UNAVAILABLE}: ${routeId}`)
  err.statusCode = 502
  err.code = ERR.RUNTIME_UNAVAILABLE
  if (cause) err.cause = cause
  return err
}

function _timeout (routeId, timeoutMs) {
  const err = new Error(`${ERR.RUNTIME_TIMEOUT}: ${routeId} (${timeoutMs}ms)`)
  err.statusCode = 504
  err.code = ERR.RUNTIME_TIMEOUT
  return err
}

function _aborted (routeId) {
  const err = new Error(`${ERR.REQUEST_ABORTED}: ${routeId}`)
  err.statusCode = 499
  err.code = ERR.REQUEST_ABORTED
  return err
}

function _overflow (routeId, limit) {
  const err = new Error(`${ERR.STREAM_OVERFLOW}: ${routeId} buffered more than ${limit} bytes`)
  err.statusCode = 502
  err.code = ERR.STREAM_OVERFLOW
  return err
}

function _versionError (got) {
  return protocol.protocolError(502, ERR.PROTOCOL_VERSION, `expected ${protocol.PROTOCOL_VERSION}, got ${got}`)
}

const _buf = (v) => Buffer.isBuffer(v) ? v : Buffer.from(String(v).trim(), 'hex')

// How long an idle connection to a runtime is kept for the next call.
const POOL_LINGER_MS = 10000

// Most body bytes one stream may hold unread before it is torn down (see
// protocol.js, "Backpressure").
const MAX_STREAM_BUFFER_BYTES = 16 * 1024 * 1024

/**
 * Caller side of app runtimes (see runtime.js / protocol.js). One transport and
 * one key pair for every runtime it calls, so they all allow-list the same
 * `publicKey`: derived from `seed` (hex or Buffer; random without one), or the
 * injected `rpc`'s own. An injected `rpc` / `dht` is left alone by close().
 * `bootstrap` and `dhtHost` (the interface its DHT node binds) set where that
 * node joins; pass the same private list every other component uses.
 * `runtimeKey` is a runtime's RPC public key (hex or Buffer).
 *
 * Unary calls share one connection per runtime, held open while any call on it
 * is in flight and for `poolLingerMs` after the last one. (@hyperswarm/rpc's own
 * pooled `request()` counts a call as finished as soon as it is sent, so its
 * linger timer tears the connection down under a call slower than that.)
 *
 * A stream whose reader falls more than `maxStreamBufferBytes` (default 16 MiB)
 * behind the runtime is destroyed with ERR_APP_STREAM_OVERFLOW and its channel
 * closed, so a slow consumer cannot grow this process's memory without bound.
 */
function createRuntimeClient (opts = {}) {
  const keyPair = opts.rpc ? opts.rpc.defaultKeyPair : DHT.keyPair(opts.seed ? _buf(opts.seed) : crypto.randomBytes(32))
  const poolLingerMs = opts.poolLingerMs ?? POOL_LINGER_MS
  const maxStreamBufferBytes = opts.maxStreamBufferBytes ?? MAX_STREAM_BUFFER_BYTES
  if (!(maxStreamBufferBytes > 0)) throw new Error('ERR_APP_RUNTIME_CLIENT_OPTIONS_INVALID: maxStreamBufferBytes must be a positive number')
  const pool = new Map()
  let rpc = null

  function assertConnected () {
    if (!rpc) throw new Error('ERR_APP_RUNTIME_CLIENT_NOT_CONNECTED')
  }

  // Built only to bind an interface (hyperdht `host`); destroyed on close().
  let ownDht = null

  async function connect () {
    if (rpc) return
    if (opts.rpc) { rpc = opts.rpc; return }
    let dht = opts.dht
    if (!dht && opts.dhtHost) {
      dht = ownDht = new DHT({ keyPair, host: opts.dhtHost, ...(opts.bootstrap ? { bootstrap: opts.bootstrap } : {}) })
    }
    rpc = new HyperswarmRPC({ keyPair, dht, bootstrap: opts.bootstrap, poolLinger: poolLingerMs })
  }

  function acquire (key) {
    const id = key.toString('hex')
    let ref = pool.get(id)
    if (!ref) {
      const conn = rpc.connect(key)
      ref = { id, conn, active: 0, timer: null }
      const entry = ref
      conn.on('close', () => {
        clearTimeout(entry.timer)
        if (pool.get(id) === entry) pool.delete(id)
      })
      pool.set(id, ref)
    }
    clearTimeout(ref.timer)
    ref.active++
    return ref
  }

  function release (ref) {
    if (--ref.active > 0) return
    ref.timer = setTimeout(() => {
      if (pool.get(ref.id) === ref) pool.delete(ref.id)
      ref.conn.destroy()
    }, poolLingerMs)
    ref.timer.unref()
  }

  async function close () {
    for (const ref of pool.values()) {
      clearTimeout(ref.timer)
      ref.conn.destroy()
    }
    pool.clear()
    const r = rpc
    const d = ownDht
    rpc = null
    ownDht = null
    if (r && !opts.rpc) await r.destroy()
    if (d) await d.destroy()
  }

  // `signal` aborts a call whose caller has gone: while the connection is still
  // opening and carries only this call, it is dropped, so the request never
  // reaches the runtime.
  async function invoke (runtimeKey, routeId, req, { identity, actor, timeoutMs, signal } = {}) {
    assertConnected()
    if (signal && signal.aborted) throw _aborted(routeId)
    let resBuf
    const ref = acquire(_buf(runtimeKey))
    const onAbort = () => {
      if (ref.active === 1 && !(ref.conn.rpc && ref.conn.rpc.opened)) ref.conn.destroy()
    }
    if (signal) signal.addEventListener('abort', onAbort, { once: true })
    try {
      const options = timeoutMs > 0 ? { timeout: timeoutMs } : undefined
      resBuf = await ref.conn.request(METHODS.INVOKE, protocol.encode(protocol.buildRequest(routeId, req, identity, actor)), options)
    } catch (cause) {
      debug('transport failure for %s: %s', routeId, cause && cause.message)
      if (signal && signal.aborted) throw _aborted(routeId)
      if (cause && cause.code === 'TIMEOUT_EXCEEDED') throw _timeout(routeId, timeoutMs)
      throw _unavailable(routeId, cause)
    } finally {
      if (signal) signal.removeEventListener('abort', onAbort)
      release(ref)
    }

    let res
    try {
      res = protocol.decode(resBuf)
    } catch (cause) {
      throw _unavailable(routeId, cause)
    }
    if (!res || res.v !== protocol.PROTOCOL_VERSION) throw _versionError(res && res.v)
    if (!res.ok) throw protocol.fromErrorResponse(res)
    return res.result
  }

  // Streams ride a protomux channel on a dedicated connection (see protocol.js).
  // `timeoutMs` bounds the wait for the response head; once the head arrived
  // the body is bounded only by the stream's own lifetime. `signal` closes the
  // channel while the head is still pending; after it, the caller destroys the
  // returned stream. Unread body bytes are capped at maxStreamBufferBytes.
  async function stream (runtimeKey, routeId, req, { identity, actor, timeoutMs, signal } = {}) {
    assertConnected()
    if (signal && signal.aborted) throw _aborted(routeId)

    return new Promise((resolve, reject) => {
      const conn = rpc.connect(_buf(runtimeKey))
      let channel = null
      let settled = false
      let ended = false
      let readable = null
      let timer = null

      const onAbort = () => fail(_aborted(routeId))
      const cleanup = () => {
        clearTimeout(timer)
        if (signal) signal.removeEventListener('abort', onAbort)
        if (channel && !channel.closed) channel.close()
        conn.destroy()
      }

      const fail = (err) => {
        if (!settled) {
          settled = true
          cleanup()
          reject(err)
        } else if (readable && !readable.destroyed) {
          readable.destroy(err)
        }
      }

      const onclose = () => {
        if (ended) return
        fail(_unavailable(routeId))
      }
      conn.on('close', onclose)

      if (timeoutMs > 0) {
        timer = setTimeout(() => {
          debug('no stream head for %s within %dms', routeId, timeoutMs)
          fail(_timeout(routeId, timeoutMs))
        }, timeoutMs)
      }
      if (signal) signal.addEventListener('abort', onAbort, { once: true })

      const mux = conn.mux
      if (!mux) return fail(_unavailable(routeId))

      channel = mux.createChannel({
        protocol: METHODS.STREAM,
        messages: [
          {},
          {
            onmessage: (buf) => {
              if (settled) return
              let head
              try {
                head = protocol.decode(buf)
              } catch (cause) {
                return fail(_unavailable(routeId, cause))
              }
              clearTimeout(timer)
              if (signal) signal.removeEventListener('abort', onAbort)
              readable = new Readable({
                read () {},
                destroy (err, cb) { cleanup(); cb(err) }
              })
              settled = true
              resolve({ statusCode: head.statusCode, headers: head.headers || {}, stream: readable })
            }
          },
          {
            onmessage: (buf) => {
              if (!readable || readable.destroyed) return
              readable.push(Buffer.from(buf))
              // The protocol has no flow control (see protocol.js), so a reader
              // this far behind ends the stream; destroy() closes the channel
              // and the connection, which stops the runtime's handler.
              if (readable.readableLength > maxStreamBufferBytes) {
                debug('stream %s overflowed %d buffered bytes', routeId, maxStreamBufferBytes)
                readable.destroy(_overflow(routeId, maxStreamBufferBytes))
              }
            }
          },
          {
            onmessage: () => {
              // END with no HEAD before it: nothing to resolve with.
              if (!settled) return fail(_unavailable(routeId))
              ended = true
              if (readable && !readable.destroyed) readable.push(null)
              cleanup()
            }
          },
          {
            onmessage: (buf) => {
              let err
              try {
                const res = protocol.decode(buf)
                err = res && res.v === protocol.PROTOCOL_VERSION ? protocol.fromErrorResponse(res) : _versionError(res && res.v)
              } catch (cause) {
                err = _unavailable(routeId, cause)
              }
              ended = true
              fail(err)
            }
          }
        ],
        onclose
      })
      if (!channel) return fail(_unavailable(routeId))

      channel.open()
      channel.messages[MSG.REQUEST].send(protocol.encode(protocol.buildRequest(routeId, req, identity, actor)))
    })
  }

  return { publicKey: Buffer.from(keyPair.publicKey), connect, invoke, stream, close }
}

// Writes the head of a stream() result, pipes its body and cleans up if either
// side goes away. Resolves (never rejects) once the response finished or was
// torn down.
function pipeToResponse (streamResult, raw) {
  raw.writeHead(streamResult.statusCode, streamResult.headers)
  if (typeof raw.flushHeaders === 'function') raw.flushHeaders()
  return new Promise((resolve) => {
    pipeline(streamResult.stream, raw, (err) => {
      if (err) debug('stream aborted: %s', err.message)
      resolve()
    })
  })
}

module.exports = { createRuntimeClient, pipeToResponse, MAX_STREAM_BUFFER_BYTES }
