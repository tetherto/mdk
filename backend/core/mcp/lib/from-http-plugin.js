'use strict'

const { z } = require('zod')
const { routeAccess, routeRequest } = require('@tetherto/mdk-rbac')

// Cap on free-text arguments when the route's schema states no maxLength, so an
// LLM can't push an unbounded string into a route handler.
const DEFAULT_MAX_STRING_LENGTH = 16384

function _zodString (schema) {
  if (Array.isArray(schema.enum)) return z.enum(schema.enum)
  let str = z.string().max(schema.maxLength !== undefined ? schema.maxLength : DEFAULT_MAX_STRING_LENGTH)
  if (schema.minLength !== undefined) str = str.min(schema.minLength)
  if (typeof schema.pattern === 'string') str = str.regex(new RegExp(schema.pattern))
  return str
}

function _zodFromJsonSchema (schema = {}) {
  let zodType

  switch (schema.type) {
    case 'string':
      zodType = _zodString(schema)
      break
    case 'integer':
    case 'number': {
      let num = schema.type === 'integer' ? z.number().int() : z.number()
      if (schema.minimum !== undefined) num = num.min(schema.minimum)
      if (schema.maximum !== undefined) num = num.max(schema.maximum)
      zodType = num
      break
    }
    case 'boolean':
      zodType = z.boolean()
      break
    case 'array': {
      let arr = z.array(schema.items ? _zodFromJsonSchema(schema.items) : z.any())
      if (schema.maxItems !== undefined) arr = arr.max(schema.maxItems)
      if (schema.minItems !== undefined) arr = arr.min(schema.minItems)
      zodType = arr
      break
    }
    case 'object':
      zodType = z.object(_objectShape(schema))
      break
    default:
      zodType = z.any()
  }

  return schema.description ? zodType.describe(schema.description) : zodType
}

// Builds a flat ZodRawShape from a JSON-schema object (as used in OpenAPI-style
// requestBody schemas): { properties: {...}, required: [...] }.
function _objectShape (schema = {}) {
  const shape = {}
  const required = new Set(schema.required || [])

  for (const [key, propSchema] of Object.entries(schema.properties || {})) {
    const zodType = _zodFromJsonSchema(propSchema)
    shape[key] = required.has(key) ? zodType : zodType.optional()
  }

  return shape
}

// Merges path/query/header parameters and the requestBody's top-level
// properties into one flat ZodRawShape (an MCP tool takes a single args
// object), tracking which keys belong to which group so the auto-generated
// handler can reassemble the gateway route's { params, query, headers, body }
// request shape from the flat args MCP hands it.
function _toolShapeFromRoute (route) {
  const shape = {}
  const groups = { path: new Set(), query: new Set(), header: new Set() }

  for (const param of route.http?.parameters || []) {
    const target = groups[param.in]
    if (!target) continue

    target.add(param.name)
    let zodType = _zodFromJsonSchema(param.schema || {})
    if (param.description) zodType = zodType.describe(param.description)
    shape[param.name] = param.required ? zodType : zodType.optional()
  }

  const bodySchema = route.http?.requestBody?.content?.['application/json']?.schema
  if (bodySchema) Object.assign(shape, _objectShape(bodySchema))

  return { shape, ...groups }
}

function _sanitizeId (id) {
  return id.replace(/[^a-zA-Z0-9]+/g, '_')
}

// The manifest `permissions` a route needs that `identity.perms` does not hold.
// On the Gateway the authVerifier enforces these; an MCP call reaches the app
// runtime as a trusted key with no verifier in between, so the check is made
// here, with the same rule the documented verifier uses (every listed
// permission must be in `perms`).
function missingPermissions (permissions, identity) {
  if (!Array.isArray(permissions) || permissions.length === 0) return []
  const held = Array.isArray(identity?.perms) ? identity.perms : []
  return permissions.filter((perm) => !held.includes(perm))
}

// A write states both hints. Unstated safety defaults to readOnlyHint: false (fail-safe as write)
// so the tool carries a declared boolean mutability hint required by validateTool.
function _annotationsFromSafety (safety) {
  if (safety === 'read-only') return { readOnlyHint: true }
  if (safety === 'write') return { readOnlyHint: false, destructiveHint: true }
  return { readOnlyHint: false }
}

// Converts an app's route table (backend/core/gateway/workers/lib/plugin-loader.js
// output: { manifest, routes }) into MCP-tool definitions shaped like
// backend/core/mcp/lib/plugin-loader.js's output, so they can be fed straight
// into startMcpHttpServer. A tool runs no app code: it hands the route id and
// the reassembled { params, query, headers, body } to `opts.call`, which
// forwards them to the app's runtime.
//
// With `opts.authority` (and `opts.appName`), every call is checked against
// spec.rbac exactly as the Gateway checks the same route: the resource
// `<app>/<path>` and the route's verb, with its instance name from the declared
// param, query or body field. The caller's identity, a verified agent token,
// arrives per call (`_handler(args, { identity })`) and is what the app runtime
// receives as `req._info`. `auth` and `permissions` no longer matter then.
//
// Without an authority, the older static identity applies:
// `opts.identity` travels with every call as the caller's identity (what a
// controller reads as `req._info`, e.g. `{ user: { userId } }`). Without one, an
// `auth: true` route refuses to run (ERR_MCP_AUTH_REQUIRED) instead of reaching
// the app with an empty identity that apps read as the privileged local caller;
// the server withholds such tools up front, so this is the backstop. The same
// holds for an `auth: true` route whose `permissions` the identity's `perms`
// do not cover (ERR_MCP_PERM_DENIED). Stream routes (`stream: true`) write to a
// raw response an MCP call does not have, so they produce no tool.
function generateToolsFromGatewayPlugin (plugin, opts = {}) {
  const staticIdentity = opts.identity || null
  const authority = opts.authority || null
  if (authority && !opts.appName) throw new Error('ERR_MCP_APP_NAME_REQUIRED: tools checked against spec.rbac need their app\'s name')

  return plugin.routes.filter((route) => route.stream !== true).map((route) => {
    const { shape, path, query, header } = _toolShapeFromRoute(route)
    const auth = route.auth === true
    const permissions = Array.isArray(route.permissions) ? Object.freeze([...route.permissions]) : undefined
    const access = authority ? routeAccess(opts.appName, route) : null
    const toolId = _sanitizeId(route.id)

    const _handler = async (args, ctx = {}) => {
      const pluginReq = { params: {}, query: {}, headers: {}, body: {} }
      for (const [key, value] of Object.entries(args || {})) {
        if (path.has(key)) pluginReq.params[key] = value
        else if (query.has(key)) pluginReq.query[key] = value
        else if (header.has(key)) pluginReq.headers[key] = value
        else pluginReq.body[key] = value
      }

      let identity
      if (authority) {
        identity = ctx.identity
        if (!identity) throw new Error('ERR_AUTH_UNAUTHORIZED')
        const request = routeRequest(access, pluginReq)
        const d = authority.evaluate(identity, request)
        if (opts.onDecision) {
          opts.onDecision({
            app: opts.appName,
            route: route.id,
            tool: toolId,
            resource: request.resource,
            verb: request.verb,
            kind: identity.kind,
            sub: identity.sub,
            ...(request.resourceName ? { resourceName: request.resourceName } : {}),
            decision: d.allowed ? 'allow' : 'deny',
            reason: d.reason,
            ...(d.role ? { role: d.role } : {}),
            policyVersion: d.policyVersion
          })
        }
        if (!d.allowed) {
          const target = request.resourceName ? `${request.resource} ${request.resourceName}` : request.resource
          throw new Error(`ERR_AUTH_FORBIDDEN: ${identity.sub} may not ${request.verb} ${target}`)
        }
      } else {
        if (auth && !staticIdentity) throw new Error('ERR_MCP_AUTH_REQUIRED')
        if (auth && missingPermissions(permissions, staticIdentity).length > 0) throw new Error('ERR_MCP_PERM_DENIED')
        identity = staticIdentity || {}
      }

      const result = await opts.call(route.id, pluginReq, identity, (authority && ctx.actor) || null)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    }

    return {
      id: toolId,
      description: route.description || plugin.manifest.description,
      schema: shape,
      annotations: _annotationsFromSafety(route.safety),
      auth,
      ...(permissions ? { permissions } : {}),
      ...(access ? { access } : {}),
      _handler
    }
  })
}

module.exports = { generateToolsFromGatewayPlugin, missingPermissions, DEFAULT_MAX_STRING_LENGTH }
