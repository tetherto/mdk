'use strict'

const path = require('path')
const { routeAccessError } = require('@tetherto/mdk-rbac')
// Deep import: index.js would pull the whole worker runtime (hyperswarm) into
// the gateway process, which also loads route tables through this file, for a
// loader that only needs fs/path/module.
const { createModuleContext } = require('@tetherto/mdk-worker/lib/module-context')

const VALID_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])

function _resolveHttpFields (route) {
  const http = route.http
  if (!http) return route

  const out = { ...route }
  if (http.method) out.method = http.method
  if (http.path) out.path = http.path

  if (!out.schema) {
    const schema = http.parameters ? _parametersToFastifySchema(http.parameters) : {}
    const body = _requestBodyToFastifySchema(http.requestBody)
    if (body) schema.body = body
    if (Object.keys(schema).length) out.schema = schema
  }

  return out
}

// The same application/json schema MCP validates tool args against, so a route
// accepts the same bodies over HTTP and over MCP. An optional body may be
// omitted entirely; when one is sent it must match.
function _requestBodyToFastifySchema (requestBody) {
  const schema = requestBody?.content?.['application/json']?.schema
  if (!schema || typeof schema !== 'object') return null
  if (requestBody.required === true) return schema
  return { anyOf: [schema, { type: 'null' }] }
}

function _parametersToFastifySchema (parameters) {
  const schema = {}
  const groups = { query: 'querystring', path: 'params', header: 'headers' }

  for (const param of parameters) {
    const target = groups[param.in]
    if (!target) continue

    if (!schema[target]) {
      schema[target] = { type: 'object', properties: {} }
    }

    schema[target].properties[param.name] = param.schema || {}

    if (param.required) {
      if (!schema[target].required) schema[target].required = []
      schema[target].required.push(param.name)
    }
  }

  return schema
}

function _normalizePath (routePath) {
  return routePath.replace(/\{([^{}]+)\}/g, ':$1')
}

function _validateManifest (manifest, pluginDir) {
  if (!manifest || typeof manifest !== 'object') {
    throw new Error(`ERR_PLUGIN_MANIFEST_INVALID: ${pluginDir}: must be a JSON object`)
  }

  for (const field of ['name', 'version']) {
    if (typeof manifest[field] !== 'string' || !manifest[field]) {
      throw new Error(`ERR_PLUGIN_MANIFEST_INVALID: ${pluginDir}: missing required field "${field}"`)
    }
  }

  if (!Array.isArray(manifest.routes) || manifest.routes.length === 0) {
    throw new Error(`ERR_PLUGIN_MANIFEST_INVALID: ${pluginDir}: "routes" must be a non-empty array`)
  }

  const seenIds = new Set()
  const seenRoutes = new Set()

  for (const route of manifest.routes) {
    if (typeof route.id !== 'string' || !route.id) {
      throw new Error(`ERR_PLUGIN_MANIFEST_INVALID: ${pluginDir}: route missing required field "id"`)
    }

    if (typeof route.handler !== 'string' || !route.handler) {
      throw new Error(`ERR_PLUGIN_MANIFEST_INVALID: ${pluginDir}: route missing required field "handler"`)
    }

    const method = (route.http?.method || route.method || '').toUpperCase()
    if (!method) {
      throw new Error(`ERR_PLUGIN_MANIFEST_INVALID: ${pluginDir}: route missing required field "method"`)
    }
    if (!VALID_METHODS.has(method)) {
      throw new Error(`ERR_PLUGIN_MANIFEST_INVALID: ${pluginDir}: route "${route.id}" has invalid method "${method}"`)
    }

    const routePath = route.http?.path || route.path
    if (typeof routePath !== 'string' || !routePath) {
      throw new Error(`ERR_PLUGIN_MANIFEST_INVALID: ${pluginDir}: route missing required field "path"`)
    }
    // Mounted under a prefix, "health" would serve /apps/<name>health.
    if (!routePath.startsWith('/')) {
      throw new Error(`ERR_PLUGIN_MANIFEST_INVALID: ${pluginDir}: route "${route.id}" path "${routePath}" must start with "/"`)
    }

    if (route.auth !== undefined && typeof route.auth !== 'boolean') {
      throw new Error(`ERR_PLUGIN_MANIFEST_INVALID: ${pluginDir}: route "${route.id}" field "auth" must be a boolean`)
    }

    // How spec.rbac governs the route: the verb it is checked as, and where its instance name is.
    const accessError = routeAccessError(route)
    if (accessError) {
      throw new Error(`ERR_PLUGIN_MANIFEST_INVALID: ${pluginDir}: route "${route.id}" ${accessError}`)
    }

    if (seenIds.has(route.id)) {
      throw new Error(`ERR_PLUGIN_ROUTE_DUPLICATE_ID: ${pluginDir}: duplicate route id "${route.id}"`)
    }
    seenIds.add(route.id)

    const key = `${method} ${_normalizePath(routePath)}`
    if (seenRoutes.has(key)) {
      throw new Error(`ERR_PLUGIN_ROUTE_DUPLICATE_PATH: ${pluginDir}: route "${route.id}" repeats ${key}`)
    }
    seenRoutes.add(key)
  }
}

// A manifest names handlers relative to its own dir; one that resolves outside
// it (../, an absolute path) would load code the operator never pointed at.
function _confinedHandlerPath (pluginDir, handlerFile, what) {
  const root = path.resolve(pluginDir)
  const handlerPath = path.resolve(root, handlerFile)
  const rel = path.relative(root, handlerPath)
  if (!rel || rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel) || path.isAbsolute(handlerFile)) {
    throw new Error(`ERR_PLUGIN_HANDLER_OUTSIDE_PLUGIN: ${pluginDir}: ${what} must be inside the plugin dir`)
  }
  return handlerPath
}

function _resolvable (file) {
  try {
    require.resolve(file)
    return true
  } catch {
    return false
  }
}

// `<file>[#export]` relative to the plugin dir, loaded through the plugin's
// module registry. A file that exists but cannot load (a missing dependency, a
// throw at load time) is LOAD_FAILED with the real cause, not NOT_FOUND.
function _loadExport (moduleContext, pluginDir, spec, what) {
  const [file, namedExport] = spec.split('#')
  const filePath = _confinedHandlerPath(pluginDir, file, `${what} "${file}"`)
  let mod
  try {
    mod = moduleContext.load(filePath)
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND' && !_resolvable(filePath)) {
      throw new Error(`ERR_PLUGIN_HANDLER_NOT_FOUND: ${pluginDir}: ${what} "${spec}"`)
    }
    throw new Error(`ERR_PLUGIN_HANDLER_LOAD_FAILED: ${pluginDir}: ${what} "${spec}": ${err.message}`, { cause: err })
  }
  return namedExport ? mod[namedExport] : mod
}

// With `handlers: false` only the manifest is read: no handler file is required.
function loadPlugin (pluginDir, context, { handlers = true } = {}) {
  const manifestPath = path.join(pluginDir, 'mdk-plugin.json')

  let manifest
  try {
    manifest = require(manifestPath)
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      throw new Error(`ERR_PLUGIN_MANIFEST_MISSING: ${pluginDir}`)
    }
    throw new Error(`ERR_PLUGIN_MANIFEST_INVALID: ${pluginDir}: ${err.message}`)
  }

  _validateManifest(manifest, pluginDir)

  // One private module registry per plugin: handler files and everything they
  // require in-package (their lib/client.js, say) load fresh for this plugin,
  // and '@tetherto/mdk-gateway/plugin' resolves to its own frozen context.
  const moduleContext = createModuleContext({
    dir: pluginDir,
    ambient: context ? { '@tetherto/mdk-gateway/plugin': context } : {},
    label: `[mdk-gateway-plugin:${manifest.name}]`
  })

  const routes = manifest.routes.map(route => {
    const resolved = _resolveHttpFields(route)
    if (!handlers) return { ...resolved, method: (resolved.method || '').toUpperCase(), path: _normalizePath(resolved.path) }

    const handler = _loadExport(moduleContext, pluginDir, resolved.handler, `route "${resolved.id}" handler`)

    if (typeof handler !== 'function') {
      throw new Error(`ERR_PLUGIN_HANDLER_NOT_FUNCTION: ${pluginDir}: route "${resolved.id}" must export a function`)
    }

    return {
      ...resolved,
      method: (resolved.method || '').toUpperCase(),
      path: _normalizePath(resolved.path),
      _handler: handler
    }
  })

  // Loads another `<file>[#export]` of the plugin (an app's `main`) in the same
  // registry, so it shares module state and the ambient context with the handlers.
  const load = (spec) => _loadExport(moduleContext, pluginDir, spec, 'module')

  return { manifest, routes, load }
}

module.exports = { loadPlugin, validateManifest: _validateManifest }
