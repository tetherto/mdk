'use strict'

const { routeAccess, routeRequest, IDENTITY_KIND } = require('@tetherto/mdk-rbac')

// Per-route access control at the Gateway, against the spec.rbac in force:
//
//   onRequest   the bearer token is verified, or the request answers 401
//               (after the Host check and rate limit, so failed attempts are
//               throttled too; before the body is read). A user's token is
//               kept as req._actorToken for the forward (plugin-adapter.js)
//   preHandler  the identity is evaluated as the route's resource and verb,
//               with its instance name from the declared param, query or body
//               field, or the request answers 403
//
// Every request is logged with the caller, app, route and decision. No route
// is open: a route nobody's rule covers answers 403 to everyone.

function _bearer (header) {
  const m = typeof header === 'string' ? /^Bearer\s+(\S+)\s*$/i.exec(header) : null
  return m ? m[1] : null
}

function _error (statusCode, message) {
  const err = new Error(message)
  err.statusCode = statusCode
  return err
}

/**
 * @param {object} app - `{ name }`, the app the route belongs to
 * @param {object} route - the route table entry
 * @param {object} authority - see authority.js
 * @returns {{ onRequest: Function, preHandler: Function, access: object }}
 */
function createRouteAuthz (app, route, authority) {
  const access = routeAccess(app.name, route)
  const base = { app: app.name, route: route.id, method: route.method, path: route.path, resource: access.resource, verb: access.verb }

  function log (req, entry) {
    req.log.info({ authz: { ...base, ...entry } }, 'authz')
  }

  async function onRequest (req, rep) {
    const token = _bearer(req.headers.authorization)
    if (!token) {
      log(req, { decision: 'unauthenticated', reason: 'no-token' })
      rep.header('www-authenticate', 'Bearer')
      throw _error(401, 'ERR_AUTH_UNAUTHORIZED')
    }
    try {
      req._identity = await authority.verify(token)
    } catch (err) {
      log(req, { decision: 'unauthenticated', reason: err.code || 'bad-token' })
      rep.header('www-authenticate', 'Bearer error="invalid_token"')
      throw _error(401, 'ERR_AUTH_UNAUTHORIZED')
    }
    // What the app runtime receives as req._info: who asked, never their token.
    req._info = req._identity
    req._authenticated = true
    // An operator's token goes on to the app runtime beside the request, so the
    // Kernel can verify and authorize the operator too (envelope.actor). A
    // service account's never does: the Kernel takes no actor but a user.
    if (req._identity.kind === IDENTITY_KIND.USER) req._actorToken = token
  }

  async function preHandler (req) {
    const request = routeRequest(access, req)
    const d = authority.evaluate(req._identity, request)
    log(req, {
      kind: req._identity.kind,
      sub: req._identity.sub,
      ...(request.resourceName ? { resourceName: request.resourceName } : {}),
      decision: d.allowed ? 'allow' : 'deny',
      reason: d.reason,
      ...(d.role ? { role: d.role } : {}),
      policyVersion: d.policyVersion
    })
    if (!d.allowed) {
      const target = request.resourceName ? `${request.resource} ${request.resourceName}` : request.resource
      throw _error(403, `ERR_AUTH_FORBIDDEN: ${req._identity.sub} may not ${request.verb} ${target}`)
    }
  }

  return { onRequest, preHandler, access }
}

module.exports = { createRouteAuthz }
