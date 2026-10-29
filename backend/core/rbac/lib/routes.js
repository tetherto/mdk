'use strict'

const { GATEWAY_VERBS } = require('./vocabulary')

// How an app route is governed, the same at the Gateway (users) and the MCP
// server (agents): its resource is `<app>/<path>` from the route template (the
// app's name, never its mount, so a rule survives a remount), its verb is the
// one the route declares or else follows the HTTP method, and its instance
// name, when the route declares where to find one, is a path param, query
// field or body field of the request.

const METHOD_VERBS = Object.freeze({ GET: 'get', HEAD: 'get', POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete' })
const NAME_SOURCES = Object.freeze(['param', 'query', 'body'])

/**
 * Check a route's optional `verb` and `resourceName` fields.
 * @returns {string|null} what is wrong, or null
 */
function routeAccessError (route) {
  if (route.verb !== undefined && !GATEWAY_VERBS.includes(route.verb)) {
    return `field "verb" must be one of ${GATEWAY_VERBS.join(', ')}`
  }
  if (route.resourceName !== undefined) {
    const rn = route.resourceName
    const keys = rn && typeof rn === 'object' && !Array.isArray(rn) ? Object.keys(rn) : []
    if (keys.length !== 1 || !NAME_SOURCES.includes(keys[0]) || typeof rn[keys[0]] !== 'string' || !rn[keys[0]]) {
      return 'field "resourceName" must be { param | query | body: "<field>" }'
    }
  }
  return null
}

/**
 * The resource and verb a route is governed as: `{ resource, verb, nameFrom? }`.
 * @param {string} appName - spec.apps[].name
 * @param {{ method: string, path: string, verb?: string, resourceName?: object }} route
 */
function routeAccess (appName, route) {
  const segments = String(route.path || '/').split('/').filter(Boolean)
  const resource = [appName, ...segments].join('/')
  const verb = route.verb || METHOD_VERBS[String(route.method).toUpperCase()] || 'get'
  const [from] = route.resourceName ? Object.keys(route.resourceName) : []
  return {
    resource,
    verb,
    ...(from ? { nameFrom: { from, field: route.resourceName[from] } } : {})
  }
}

/**
 * The RBAC request for one HTTP request to a route: `{ resource, verb, resourceName? }`.
 * An instance name that is missing, empty or not a string is left out, so a rule
 * scoped by resourceNames does not match the request.
 * @param {ReturnType<typeof routeAccess>} access
 * @param {{ params?: object, query?: object, body?: object }} req
 */
function routeRequest (access, req = {}) {
  const out = { resource: access.resource, verb: access.verb }
  if (access.nameFrom) {
    const bag = access.nameFrom.from === 'param' ? req.params : access.nameFrom.from === 'query' ? req.query : req.body
    const value = bag && typeof bag === 'object' ? bag[access.nameFrom.field] : undefined
    if (typeof value === 'string' && value) out.resourceName = value
  }
  return out
}

module.exports = { routeAccess, routeRequest, routeAccessError, METHOD_VERBS }
