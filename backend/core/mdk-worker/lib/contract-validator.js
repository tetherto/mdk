'use strict'

const fs = require('fs')
const path = require('path')

const SCHEMA_PATH = path.join(__dirname, '..', 'mdk-contract.schema.json')

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

function _matchesType (expected, v) {
  if (expected === 'integer') return typeof v === 'number' && Number.isInteger(v)
  return _jsonType(v) === expected
}

// Strict-tier rules are the v1 requirements the rollout gates: the if/then
// requirements (unit on numeric telemetry, min/max on number params) and every
// schema node annotated "x-mdk-strict": true (the contractVersion stamp, the
// canonical unit vocabulary). The tier is declared structurally in the schema —
// never inferred from error paths or message text — so adding a strict field
// later is a schema-only change. A legacy contract (no contractVersion) gets
// strict-tier findings as warnings; a declared-version contract, or strict
// mode, gets them as errors.
function _push (out, strict, code, text) {
  ;(strict ? out.strict : out.base).push(`${code}: ${text}`)
}

// Implements the JSON Schema subset mdk-contract.schema.json uses (type, enum,
// const, required, properties, additionalProperties, items, if/then, minimum,
// allOf, x-mdk-strict). A schema feature outside this subset would validate as
// always-passing here; the ajv parity test in backend/workers guards that drift.
function _validateNode (schema, value, at, out, inStrict) {
  const strict = inStrict || schema['x-mdk-strict'] === true
  if (schema.type && !_matchesType(schema.type, value)) {
    _push(out, strict, 'ERR_CONTRACT_TYPE', `${at || '/'} expected ${schema.type}, got ${_jsonType(value)}`)
    return
  }
  if ('const' in schema && value !== schema.const) {
    _push(out, strict, 'ERR_CONTRACT_ENUM', `${at || '/'} is ${JSON.stringify(value)}, expected ${JSON.stringify(schema.const)}`)
  }
  if (schema.enum && !schema.enum.includes(value)) {
    _push(out, strict, 'ERR_CONTRACT_ENUM', `${at || '/'} is ${JSON.stringify(value)}, allowed: ${schema.enum.join(' | ')}`)
  }
  if (typeof schema.minimum === 'number' && typeof value === 'number' && value < schema.minimum) {
    _push(out, strict, 'ERR_CONTRACT_MINIMUM', `${at || '/'} is ${value}, minimum ${schema.minimum}`)
  }
  if (Array.isArray(schema.allOf)) {
    for (const sub of schema.allOf) _validateNode(sub, value, at, out, strict)
  }
  if (_jsonType(value) === 'object') {
    const props = schema.properties || {}
    for (const key of schema.required || []) {
      if (!(key in value)) {
        const strictReq = strict || (props[key] && props[key]['x-mdk-strict'] === true)
        _push(out, strictReq, 'ERR_CONTRACT_REQUIRED', `${at || '/'} missing required property '${key}'`)
      }
    }
    if (schema.if && schema.then) {
      const scratch = { base: [], strict: [] }
      _validateNode(schema.if, value, at, scratch, false)
      if (scratch.base.length === 0 && scratch.strict.length === 0) {
        _validateNode(schema.then, value, at, out, true)
      }
    }
    for (const [key, v] of Object.entries(value)) {
      if (props[key]) {
        _validateNode(props[key], v, `${at}/${key}`, out, strict)
      } else if (schema.additionalProperties === false) {
        _push(out, strict, 'ERR_CONTRACT_UNEXPECTED', `${at || '/'} has unexpected property '${key}'`)
      } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        _validateNode(schema.additionalProperties, v, `${at}/${key}`, out, strict)
      }
    }
  }
  if (Array.isArray(value) && schema.items) {
    value.forEach((v, i) => _validateNode(schema.items, v, `${at}/${i}`, out, strict))
  }
}

// Rules the schema cannot express. Handler existence needs the plugin dir, so
// it only runs when the caller has one (a fetched external contract does not).
function _semanticChecks (contract, dir, errors) {
  if (_jsonType(contract) !== 'object') return
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
 * coherent min/max/default, and (when opts.dir names the plugin directory)
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
  const out = { base: [], strict: [] }
  _validateNode(_loadSchema(), contract, '', out, false)
  if (opts.semantic !== false) _semanticChecks(contract, opts.dir, out.base)

  const declared = _jsonType(contract) === 'object' && typeof contract.contractVersion === 'string'
  const strictAsErrors = opts.strict === true || declared
  const errors = strictAsErrors ? out.base.concat(out.strict) : out.base
  const warnings = strictAsErrors ? [] : out.strict
  return { ok: errors.length === 0, errors, warnings }
}

module.exports = { validateContract, SCHEMA_PATH }
