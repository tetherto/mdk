'use strict'

const path = require('path')

const VALID_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])

function _resolveHttpFields (route) {
  const http = route.http
  if (!http) return route

  const out = { ...route }
  if (http.method) out.method = http.method
  if (http.path) out.path = http.path

  if (http.parameters && !out.schema) {
    out.schema = _parametersToFastifySchema(http.parameters)
  }

  return out
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
  return routePath.replace(/\{([^}]+)\}/g, ':$1')
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

    if (seenIds.has(route.id)) {
      throw new Error(`ERR_PLUGIN_ROUTE_DUPLICATE_ID: ${pluginDir}: duplicate route id "${route.id}"`)
    }
    seenIds.add(route.id)
  }
}

function loadPlugin (pluginDir) {
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

  const routes = manifest.routes.map(route => {
    const resolved = _resolveHttpFields(route)

    const [handlerFile, namedExport] = resolved.handler.split('#')
    const handlerPath = path.resolve(pluginDir, handlerFile)
    let mod
    try {
      mod = require(handlerPath)
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND') {
        throw new Error(`ERR_PLUGIN_HANDLER_NOT_FOUND: ${pluginDir}: route "${resolved.id}" handler "${resolved.handler}"`)
      }
      throw new Error(`ERR_PLUGIN_HANDLER_NOT_FOUND: ${pluginDir}: route "${resolved.id}": ${err.message}`)
    }

    const handler = namedExport ? mod[namedExport] : mod

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

  return { manifest, routes }
}

module.exports = { loadPlugin }
