'use strict'

const fs = require('fs')
const path = require('path')
const { validateSubset } = require('./schema-subset')

const SCHEMA_PATH = path.join(__dirname, '..', 'mdk-contract.schema.json')
const PATH_SEGMENT = /^(?:[A-Za-z_$][\w$]*|0|[1-9]\d*)$/
const PATH_SEGMENT_RESERVED = new Set(['__proto__', 'constructor', 'prototype'])

let _schema = null

function _loadSchema () {
  if (!_schema) _schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'))
  return _schema
}

function _jsonType (v) {
  if (Array.isArray(v)) return 'array'
  if (v === null) return 'null'
  return typeof v
}

// The schema walk lives in lib/schema-subset.js, shared with app route tables.
// Strict-tier rules here are the v1 requirements the rollout gates: the if/then
// requirements (unit on numeric telemetry, min/max on number params) and every
// schema node annotated "x-mdk-strict": true (the contractVersion stamp, the
// canonical unit vocabulary). A legacy contract (no contractVersion) gets
// strict-tier findings as warnings; a declared-version contract, or strict
// mode, gets them as errors.

// Rules the schema cannot express. Handler existence needs the plugin dir, so
// it only runs when the caller has one (a fetched external contract does not).
function _semanticChecks (contract, dir, errors) {
  if (_jsonType(contract) !== 'object') return

  const retention = contract.telemetryRetention
  if (_jsonType(retention) === 'object' && typeof retention.keepMs === 'number') {
    for (const key of ['rawMs', 'rollupIntervalMs']) {
      if (typeof retention[key] === 'number' && retention[key] > retention.keepMs) {
        errors.push(`ERR_CONTRACT_RETENTION_INVALID: /telemetryRetention ${key} ${retention[key]} > keepMs ${retention.keepMs}`)
      }
    }
  }

  const caps = contract.capabilities
  if (_jsonType(caps) !== 'object') return

  for (const section of ['telemetry', 'commands']) {
    const entries = Array.isArray(caps[section]) ? caps[section] : []
    const seen = new Set()
    entries.forEach((entry, i) => {
      const at = `/capabilities/${section}/${i}`
      if (_jsonType(entry) !== 'object') return
      if (entry.name) {
        if (seen.has(entry.name)) errors.push(`ERR_CONTRACT_DUPLICATE_NAME: ${at} '${entry.name}' already declared in ${section}`)
        seen.add(entry.name)
      }
      if (dir && typeof entry.handler === 'string' && entry.handler) {
        const file = path.resolve(dir, entry.handler)
        if (!fs.existsSync(file)) errors.push(`ERR_CONTRACT_HANDLER_NOT_FOUND: ${at} handler '${entry.handler}' does not exist (resolved: ${file})`)
      }
      if (section === 'telemetry' && typeof entry.path === 'string') {
        const segments = entry.path.split('.')
        if (!segments.every((s) => PATH_SEGMENT.test(s) && !PATH_SEGMENT_RESERVED.has(s))) {
          errors.push(`ERR_CONTRACT_PATH_INVALID: ${at} path '${entry.path}' is not a dotted keypath of identifiers or array indices`)
        }
      }
    })
  }

  const commands = Array.isArray(caps.commands) ? caps.commands : []
  commands.forEach((cmd, i) => {
    if (_jsonType(cmd) !== 'object' || !Array.isArray(cmd.params)) return
    cmd.params.forEach((p, j) => {
      if (_jsonType(p) !== 'object' || p.type !== 'number') return
      const at = `/capabilities/commands/${i}/params/${j}`
      if (typeof p.min === 'number' && typeof p.max === 'number') {
        if (p.min > p.max) errors.push(`ERR_CONTRACT_PARAM_BOUNDS_INVALID: ${at} min ${p.min} > max ${p.max}`)
        if (typeof p.default === 'number' && (p.default < p.min || p.default > p.max)) {
          errors.push(`ERR_CONTRACT_DEFAULT_RANGE: ${at} default ${p.default} outside [${p.min}, ${p.max}]`)
        }
      }
    })
  })
}

/**
 * Validate a parsed mdk-contract.json against the vendored schema, plus the
 * semantic rules the schema cannot express: unique telemetry/command names,
 * coherent min/max/default, coherent telemetryRetention windows, well-formed
 * telemetry `path` keypaths, and (when opts.dir names the plugin directory)
 * every handler file present on disk.
 *
 * validateContract(contract, { dir?, semantic = true, strict = false })
 *   -> { ok, errors, warnings }
 *
 * Version gating: a contract that DECLARES a contractVersion opted into the
 * generation contract, so it is held to the full requirements as errors — an
 * unknown value additionally fails the schema's version enum, with the body
 * problems reported alongside rather than masked. A legacy contract (no
 * contractVersion) gets the strict-tier requirements — unit on numeric
 * telemetry, the unit vocabulary, min/max on number params, the version stamp
 * itself — as warnings instead. strict: true forces them to errors regardless
 * (the enforcement flip). Pass semantic: false for schema-only conformance
 * (the catalogue generator's mode). ok means no errors; warnings never fail a
 * contract.
 */
function validateContract (contract, opts = {}) {
  const out = validateSubset(_loadSchema(), contract)
  if (opts.semantic !== false) _semanticChecks(contract, opts.dir, out.base)

  const declared = _jsonType(contract) === 'object' && typeof contract.contractVersion === 'string'
  const strictAsErrors = opts.strict === true || declared
  const errors = strictAsErrors ? out.base.concat(out.strict) : out.base
  const warnings = strictAsErrors ? [] : out.strict
  return { ok: errors.length === 0, errors, warnings }
}

module.exports = { validateContract, SCHEMA_PATH }
