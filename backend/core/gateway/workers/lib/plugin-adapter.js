'use strict'

const crypto = require('crypto')
const fs = require('fs')
const { STATUS_CODES } = require('http')
const { pipeToResponse } = require('@tetherto/mdk-app-runtime')
const { cachedRoute } = require('./server/lib/cachedRoute')
const { send200 } = require('./server/lib/send200')
const { createAuthHook, canOverwriteCache } = require('./security')
const { createRouteAuthz } = require('./authz')

// Only ERR_* codes and Fastify's own 4xx errors (validation, content type,
// body size) describe the request; any other message can carry internals, so
// the client gets the status text and the log gets the error.
function errorResponse (err, log) {
  const statusCode = Number.isInteger(err.statusCode) && err.statusCode >= 400 ? err.statusCode : 400
  const error = STATUS_CODES[statusCode] || 'Bad Request'
  const isSafe = /^ERR_/.test(err.message) || (/^FST_/.test(err.code) && statusCode < 500)
  if (!isSafe && !err.remote) log?.error(err)
  return { statusCode, error, message: isSafe ? err.message : error }
}

function _extractCacheKeyParts (fields, req) {
  return fields.map(field => {
    const parts = field.split('.')
    return parts.reduce((obj, key) => (obj != null ? obj[key] : undefined), req)
  })
}

// JSON with object keys sorted, so the same identity always hashes the same
// whatever order the verifier built it in.
function _stableStringify (value) {
  if (Array.isArray(value)) return `[${value.map(v => _stableStringify(v ?? null)).join(',')}]`
  if (value && typeof value === 'object' && typeof value.toJSON !== 'function') {
    return `{${Object.keys(value).sort().filter(k => value[k] !== undefined).map(k => `${JSON.stringify(k)}:${_stableStringify(value[k])}`).join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

// A cache key component for the verified caller of an `auth: true` route, so
// two identities never share a cached response or an in-flight call.
function _identityCacheKey (req) {
  return 'id:' + crypto.createHash('sha256').update(_stableStringify(req._info || {})).digest('hex')
}

// Bounds a unary call, and the wait for a stream route's response head, so a
// hung controller cannot hold the HTTP request open forever (common.json `appTimeoutMs`).
const APP_TIMEOUT_MS = 60000

// A malformed value must fail the boot: one that is not a positive number would
// silently drop the bound. Digit strings are accepted, as for bodyLimit.
function resolveAppTimeout (conf = {}) {
  let ms = conf.appTimeoutMs
  if (ms === undefined || ms === null) return APP_TIMEOUT_MS
  if (typeof ms === 'string' && /^\d+$/.test(ms)) ms = Number(ms)
  if (!Number.isInteger(ms) || ms <= 0) {
    throw new Error('ERR_GATEWAY_APP_TIMEOUT_INVALID: appTimeoutMs must be a positive integer (milliseconds)')
  }
  return ms
}

// Re-read on every request, so a runtime may start, or restart under a new
// key, after the Gateway. Until it has published a key its routes answer 503.
async function _runtimeKey (app) {
  const key = await fs.promises.readFile(app.keyFile, 'utf8').then(s => s.trim(), () => '')
  if (/^[0-9a-f]{64}$/i.test(key)) return key
  const err = new Error(`ERR_APP_RUNTIME_UNAVAILABLE: ${app.name}`)
  err.statusCode = 503
  throw err
}

// The caller's credentials stay at the Gateway: the authVerifier already turned
// them into the identity, and app code must not be able to replay them.
const CREDENTIAL_HEADERS = ['authorization', 'proxy-authorization', 'cookie']

function _appRequest (req) {
  const headers = { ...req.headers }
  for (const name of CREDENTIAL_HEADERS) delete headers[name]
  return { params: req.params, query: req.query, body: req.body, headers }
}

// Aborts when the client goes away before its response finished, so a request
// nobody waits for is not forwarded.
function _disconnectSignal (rep) {
  const ac = new AbortController()
  rep.raw.once('close', () => { if (!rep.raw.writableFinished) ac.abort() })
  return ac.signal
}

// One call to the app's runtime: `method` is 'invoke' (unary) or 'stream'. The
// runtime takes `{ params, query, body, headers }` from `req`; the identity the
// authVerifier set (none on an open route) travels beside it, and so does a
// signed-in operator's token (`actor`, see authz.js), which the runtime hands
// the Kernel and never to app code.
async function _forward (client, app, route, method, req, timeoutMs, signal) {
  const key = await _runtimeKey(app)
  return client[method](key, route.id, _appRequest(req), { identity: req._info || {}, actor: req._actorToken || null, timeoutMs, signal })
}

// Mounts an app's route table (`app.routes`) under `app.mount` (default
// `/apps/<name>`) and forwards every request to the app's runtime over HRPC.
//
// opts.authority (see authority.js): every route of the app needs a bearer
// token and a spec.rbac rule for its resource and verb (authz.js); `auth` on a
// route no longer matters. The verified identity reaches the app runtime as
// the call's `identity`, and a user's token as its `actor`.
//
// Without an authority, the older opts.authVerifier: async (request, route) =>
// identity | false. Every `auth: true` route gets a route-level preParsing hook
// that runs it: after the Host check and rate limit (onRequest, so failed
// attempts are throttled too), before body parsing, validation, the cache and
// the forward. With no verifier those routes answer 401. Routes without
// `auth: true` stay open.
function buildFastifyRoutes (app, client, ctx, opts = {}) {
  const mount = app.mount || `/apps/${app.name}`
  const timeoutMs = resolveAppTimeout(ctx.conf)
  const prefix = mount === '/' ? '' : mount

  return app.routes.map(route => {
    const fastifyRoute = {
      method: route.method,
      // A route at "/" answers at the mount itself (/apps/<name>), not only with a trailing slash.
      url: prefix && route.path === '/' ? prefix : prefix + route.path
    }

    if (route.schema) {
      fastifyRoute.schema = route.schema
    }

    if (opts.authority) {
      const authz = createRouteAuthz(app, route, opts.authority)
      fastifyRoute.onRequest = authz.onRequest
      fastifyRoute.preHandler = authz.preHandler
    } else if (route.auth === true) {
      fastifyRoute.preParsing = createAuthHook(opts.authVerifier || null, Object.freeze({
        id: route.id,
        method: route.method,
        path: route.path,
        app: app.name,
        permissions: Array.isArray(route.permissions) ? Object.freeze([...route.permissions]) : undefined
      }))
    }

    // A stream route owns the raw ServerResponse. The reply is hijacked so
    // Fastify never serializes; the boundary catch is load-bearing — a
    // rejection after hijack() is otherwise swallowed (reply.sent is true)
    // and the socket stays open forever.
    if (route.stream === true) {
      fastifyRoute.handler = async (req, rep) => {
        const signal = _disconnectSignal(rep)
        rep.hijack()
        const raw = rep.raw
        try {
          await pipeToResponse(await _forward(client, app, route, 'stream', req, timeoutMs, signal), raw)
        } catch (err) {
          if (!raw.headersSent) {
            const body = errorResponse(err, req.log)
            raw.writeHead(body.statusCode, { 'content-type': 'application/json' })
            raw.end(JSON.stringify(body))
          } else if (!raw.writableEnded) {
            raw.end()
          }
        }
      }
      return fastifyRoute
    }

    const cacheFields = route.cache

    fastifyRoute.handler = async (req, rep) => {
      // A cached call is shared by every request waiting on its key, so one
      // client leaving must not abort it.
      const signal = Array.isArray(cacheFields) ? undefined : _disconnectSignal(rep)
      const forward = () => _forward(client, app, route, 'invoke', req, timeoutMs, signal)

      let result
      if (cacheFields && Array.isArray(cacheFields)) {
        const keyParts = [app.name, route.id, ..._extractCacheKeyParts(cacheFields, req)]
        // Per caller on a checked route: the response may depend on who asked.
        if (opts.authority || route.auth === true) keyParts.push(_identityCacheKey(req))
        result = await cachedRoute(
          ctx,
          keyParts,
          route.path,
          forward,
          // A forced refresh is honoured only for a caller the authVerifier
          // vouched for and granted OVERWRITE_CACHE_PERM; a bare header is not proof.
          String(req.query?.overwriteCache) === 'true' && canOverwriteCache(req)
        )
      } else {
        result = await forward()
      }

      return send200(rep, result)
    }

    return fastifyRoute
  })
}

module.exports = { buildFastifyRoutes, errorResponse, resolveAppTimeout, runtimeKey: _runtimeKey }
