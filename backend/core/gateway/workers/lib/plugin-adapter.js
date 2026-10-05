'use strict'

const { STATUS_CODES } = require('http')
const { cachedRoute } = require('./server/lib/cachedRoute')
const { send200 } = require('./server/lib/send200')

// Only ERR_* codes and Fastify's own 4xx errors (validation, content type,
// body size) describe the request; any other message can carry internals, so
// the client gets the status text and the log gets the error.
function errorResponse (err, log) {
  const statusCode = Number.isInteger(err.statusCode) && err.statusCode >= 400 ? err.statusCode : 400
  const error = STATUS_CODES[statusCode] || 'Bad Request'
  const isSafe = /^ERR_/.test(err.message) || (/^FST_/.test(err.code) && statusCode < 500)
  if (!isSafe) log?.error(err)
  return { statusCode, error, message: isSafe ? err.message : error }
}

function _extractCacheKeyParts (fields, req) {
  return fields.map(field => {
    const parts = field.split('.')
    return parts.reduce((obj, key) => (obj != null ? obj[key] : undefined), req)
  })
}

function _pluginReq (req) {
  return {
    params: req.params,
    query: req.query,
    body: req.body,
    headers: req.headers,
    _info: req._info || {}
  }
}

function buildFastifyRoutes (plugin, ctx) {
  return plugin.routes.map(route => {
    const fastifyRoute = {
      method: route.method,
      url: route.path
    }

    if (route.schema) {
      fastifyRoute.schema = route.schema
    }

    // A stream route owns the raw ServerResponse. The reply is hijacked so
    // Fastify never serializes; the boundary catch is load-bearing — a
    // rejection after hijack() is otherwise swallowed (reply.sent is true)
    // and the socket stays open forever.
    if (route.stream === true) {
      fastifyRoute.handler = async (req, rep) => {
        rep.hijack()
        const raw = rep.raw
        try {
          await route._handler(_pluginReq(req), raw)
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
      const pluginReq = _pluginReq(req)

      let result
      if (cacheFields && Array.isArray(cacheFields)) {
        const keyParts = [route.id, ..._extractCacheKeyParts(cacheFields, req)]
        result = await cachedRoute(
          ctx,
          keyParts,
          route.path,
          () => route._handler(pluginReq),
          Boolean(req.headers.authorization) && String(req.query?.overwriteCache) === 'true'
        )
      } else {
        result = await route._handler(pluginReq)
      }

      return send200(rep, result)
    }

    return fastifyRoute
  })
}

module.exports = { buildFastifyRoutes, errorResponse }
