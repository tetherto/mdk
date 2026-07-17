'use strict'

const path = require('path')
const debug = require('debug')('mdk:worker:plugin-loader')

const SECTIONS = ['telemetry', 'commands']

/**
 * Validate a Worker Plugin ({ contract, dir, connect, disconnect? }) and
 * eagerly require every handler declared in the contract. Any missing module,
 * non-function export, missing `handler` field or duplicate name aborts with
 * an ERR_PLUGIN_* error — nothing is loaded lazily at request time.
 *
 * Returns { contract, publishedContract, handlers, connect, disconnect }.
 * `publishedContract` is a copy with `handler` fields stripped — handler
 * paths are plugin-internal and never leave the process on capability pulls.
 */
function loadPlugin (plugin) {
  if (!plugin || typeof plugin !== 'object') throw new Error('ERR_PLUGIN_REQUIRED')
  if (typeof plugin.connect !== 'function') throw new Error('ERR_PLUGIN_CONNECT_NOT_FUNCTION')
  if (plugin.disconnect !== undefined && typeof plugin.disconnect !== 'function') {
    throw new Error('ERR_PLUGIN_DISCONNECT_NOT_FUNCTION')
  }
  if (typeof plugin.dir !== 'string' || !plugin.dir) throw new Error('ERR_PLUGIN_DIR_MISSING')

  const contract = plugin.contract
  if (!contract || typeof contract !== 'object') throw new Error('ERR_PLUGIN_CONTRACT_MISSING')
  // The Kernel terminates workers whose capability payload lacks either object.
  if (!contract.metadata || typeof contract.metadata !== 'object') throw new Error('ERR_PLUGIN_CONTRACT_METADATA_MISSING')
  if (!contract.capabilities || typeof contract.capabilities !== 'object') throw new Error('ERR_PLUGIN_CONTRACT_CAPABILITIES_MISSING')

  const handlers = {}
  for (const section of SECTIONS) {
    handlers[section] = _loadSection(contract, plugin.dir, section)
  }

  return {
    contract,
    publishedContract: _stripHandlers(contract),
    handlers,
    connect: plugin.connect,
    disconnect: plugin.disconnect || null
  }
}

function _loadSection (contract, dir, section) {
  const entries = contract.capabilities[section] || []
  if (!Array.isArray(entries)) throw new Error(`ERR_PLUGIN_SECTION_NOT_ARRAY: ${section}`)

  const loaded = new Map()
  for (const entry of entries) {
    if (!entry || typeof entry.name !== 'string' || !entry.name) {
      throw new Error(`ERR_PLUGIN_ENTRY_NAME_MISSING: ${section}`)
    }
    if (loaded.has(entry.name)) throw new Error(`ERR_PLUGIN_DUPLICATE_NAME: ${section}.${entry.name}`)
    if (typeof entry.handler !== 'string' || !entry.handler) {
      throw new Error(`ERR_PLUGIN_HANDLER_MISSING: ${section}.${entry.name}`)
    }

    const file = path.resolve(dir, entry.handler)
    let fn
    try {
      fn = require(file)
    } catch (err) {
      throw new Error(`ERR_PLUGIN_HANDLER_NOT_FOUND: ${section}.${entry.name}: ${file}: ${err.message}`)
    }
    if (typeof fn !== 'function') {
      throw new Error(`ERR_PLUGIN_HANDLER_NOT_FUNCTION: ${section}.${entry.name}: ${file}`)
    }

    loaded.set(entry.name, fn)
    debug('loaded %s handler %s from %s', section, entry.name, entry.handler)
  }
  return loaded
}

function _stripHandlers (contract) {
  const copy = JSON.parse(JSON.stringify(contract))
  for (const section of SECTIONS) {
    for (const entry of copy.capabilities[section] || []) delete entry.handler
  }
  return copy
}

module.exports = { loadPlugin }
