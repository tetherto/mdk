'use strict'

// The zero-dependency JSON Schema subset MDK validates its declarations with:
// a Worker's mdk-contract.json and an app's route table both run through it, so
// the runtime ships no schema library. A keyword outside SUBSET_KEYWORDS
// validates as always-passing here, so every schema that uses this validator
// has an ajv parity test (test/contract-validator-parity.test.mjs,
// test/route-table-validator-parity.test.mjs) pinning the two to the same verdict.

const SUBSET_KEYWORDS = Object.freeze([
  'type', 'enum', 'const', 'required', 'properties', 'additionalProperties',
  'items', 'if', 'then', 'minimum', 'allOf', 'x-mdk-strict'
])

// Keywords that describe rather than constrain; a schema may carry them freely.
const ANNOTATION_KEYWORDS = Object.freeze([
  '$schema', '$id', '$comment', 'title', 'description', 'examples', 'default'
])

function _jsonType (v) {
  if (Array.isArray(v)) return 'array'
  if (v === null) return 'null'
  return typeof v
}

function _matchesType (expected, v) {
  if (expected === 'integer') return typeof v === 'number' && Number.isInteger(v)
  return _jsonType(v) === expected
}

// Strict-tier rules are the ones a declaration opts into by stamping a version:
// every schema node annotated "x-mdk-strict": true, and every if/then
// requirement. The tier is declared structurally in the schema — never inferred
// from error paths or message text — so adding a strict rule later is a
// schema-only change. Callers decide whether the strict tier is errors or
// warnings.
function _push (out, strict, code, text) {
  ;(strict ? out.strict : out.base).push(`${out.prefix}_${code}: ${text}`)
}

function _validateNode (schema, value, at, out, inStrict) {
  const strict = inStrict || schema['x-mdk-strict'] === true
  if (schema.type && !_matchesType(schema.type, value)) {
    _push(out, strict, 'TYPE', `${at || '/'} expected ${schema.type}, got ${_jsonType(value)}`)
    return
  }
  if ('const' in schema && value !== schema.const) {
    _push(out, strict, 'ENUM', `${at || '/'} is ${JSON.stringify(value)}, expected ${JSON.stringify(schema.const)}`)
  }
  if (schema.enum && !schema.enum.includes(value)) {
    _push(out, strict, 'ENUM', `${at || '/'} is ${JSON.stringify(value)}, allowed: ${schema.enum.join(' | ')}`)
  }
  if (typeof schema.minimum === 'number' && typeof value === 'number' && value < schema.minimum) {
    _push(out, strict, 'MINIMUM', `${at || '/'} is ${value}, minimum ${schema.minimum}`)
  }
  if (Array.isArray(schema.allOf)) {
    for (const sub of schema.allOf) _validateNode(sub, value, at, out, strict)
  }
  if (_jsonType(value) === 'object') {
    const props = schema.properties || {}
    for (const key of schema.required || []) {
      if (!(key in value)) {
        const strictReq = strict || (props[key] && props[key]['x-mdk-strict'] === true)
        _push(out, strictReq, 'REQUIRED', `${at || '/'} missing required property '${key}'`)
      }
    }
    if (schema.if && schema.then) {
      const scratch = { base: [], strict: [], prefix: out.prefix }
      _validateNode(schema.if, value, at, scratch, false)
      if (scratch.base.length === 0 && scratch.strict.length === 0) {
        _validateNode(schema.then, value, at, out, true)
      }
    }
    for (const [key, v] of Object.entries(value)) {
      if (props[key]) {
        _validateNode(props[key], v, `${at}/${key}`, out, strict)
      } else if (schema.additionalProperties === false) {
        _push(out, strict, 'UNEXPECTED', `${at || '/'} has unexpected property '${key}'`)
      } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        _validateNode(schema.additionalProperties, v, `${at}/${key}`, out, strict)
      }
    }
  }
  if (Array.isArray(value) && schema.items) {
    value.forEach((v, i) => _validateNode(schema.items, v, `${at}/${i}`, out, strict))
  }
}

/**
 * Validate `value` against `schema` using only SUBSET_KEYWORDS.
 *
 * validateSubset(schema, value, { codePrefix = 'ERR_CONTRACT' })
 *   -> { base: string[], strict: string[] }
 *
 * Each finding is `<codePrefix>_<TYPE|ENUM|MINIMUM|REQUIRED|UNEXPECTED>: <path> <text>`.
 * `base` findings always fail; `strict` findings come from x-mdk-strict nodes and
 * if/then requirements, and the caller decides whether they fail.
 */
function validateSubset (schema, value, opts = {}) {
  const out = { base: [], strict: [], prefix: opts.codePrefix || 'ERR_CONTRACT' }
  _validateNode(schema, value, '', out, false)
  return { base: out.base, strict: out.strict }
}

module.exports = { validateSubset, SUBSET_KEYWORDS, ANNOTATION_KEYWORDS }
