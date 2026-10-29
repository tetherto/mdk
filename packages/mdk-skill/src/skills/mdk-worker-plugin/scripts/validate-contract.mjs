#!/usr/bin/env node
// Validate a worker's mdk-contract.json against ../references/mdk-contract.schema.json.
//
//   node validate-contract.mjs <path/to/mdk-contract.json>                  # exit 0/1
//   node validate-contract.mjs --strict <path/to/mdk-contract.json>         # v1 warnings become errors
//   node validate-contract.mjs --schema-only <path/to/mdk-contract.json>    # skip semantic checks
//
// Zero-dependency: implements the JSON Schema subset the schema uses (type,
// enum, const, required, properties, additionalProperties, items, if/then,
// minimum, allOf, x-mdk-strict), plus semantic checks the schema cannot
// express — handler files exist, names are unique, min <= max and default
// within range.
//
// Version gating, mirroring @tetherto/mdk-worker's validateContract: a contract
// declaring contractVersion '1' is held to the full v1 requirements (unit on
// numeric telemetry from the canonical vocabulary, min/max on number params)
// as errors. A legacy contract (no contractVersion) gets them as WARNINGS and
// still exits 0; --strict forces them to errors — the enforcement flip.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const SCHEMA_PATH = path.resolve(SCRIPT_DIR, '..', 'references', 'mdk-contract.schema.json')

function jsonType (v) {
  if (Array.isArray(v)) return 'array'
  if (v === null) return 'null'
  return typeof v
}

function matchesType (expected, v) {
  if (expected === 'integer') return typeof v === 'number' && Number.isInteger(v)
  return jsonType(v) === expected
}

// Strict tier = the v1 requirements: then-branch rules (unit, min/max) and
// every schema node annotated "x-mdk-strict": true (contractVersion, the unit
// vocabulary). Declared structurally in the schema, never inferred from error
// paths or message text — mirrors backend/core/mdk-worker/lib/contract-validator.js.
function push (out, strict, code, text) {
  ;(strict ? out.strict : out.base).push(`${code}: ${text}`)
}

function validateNode (schema, value, at, out, inStrict) {
  const strict = inStrict || schema['x-mdk-strict'] === true
  if (schema.type && !matchesType(schema.type, value)) {
    push(out, strict, 'ERR_CONTRACT_TYPE', `${at || '/'} expected ${schema.type}, got ${jsonType(value)}`)
    return
  }
  if ('const' in schema && value !== schema.const) {
    push(out, strict, 'ERR_CONTRACT_ENUM', `${at || '/'} is ${JSON.stringify(value)}, expected ${JSON.stringify(schema.const)}`)
  }
  if (schema.enum && !schema.enum.includes(value)) {
    push(out, strict, 'ERR_CONTRACT_ENUM', `${at || '/'} is ${JSON.stringify(value)}, allowed: ${schema.enum.join(' | ')}`)
  }
  if (typeof schema.minimum === 'number' && typeof value === 'number' && value < schema.minimum) {
    push(out, strict, 'ERR_CONTRACT_MINIMUM', `${at || '/'} is ${value}, minimum ${schema.minimum}`)
  }
  if (Array.isArray(schema.allOf)) {
    for (const sub of schema.allOf) validateNode(sub, value, at, out, strict)
  }
  if (jsonType(value) === 'object') {
    const props = schema.properties || {}
    for (const key of schema.required || []) {
      if (!(key in value)) {
        const strictReq = strict || (props[key] && props[key]['x-mdk-strict'] === true)
        push(out, strictReq, 'ERR_CONTRACT_REQUIRED', `${at || '/'} missing required property '${key}'`)
      }
    }
    if (schema.if && schema.then) {
      const scratch = { base: [], strict: [] }
      validateNode(schema.if, value, at, scratch, false)
      if (scratch.base.length === 0 && scratch.strict.length === 0) {
        validateNode(schema.then, value, at, out, true)
      }
    }
    for (const [key, v] of Object.entries(value)) {
      if (props[key]) {
        validateNode(props[key], v, `${at}/${key}`, out, strict)
      } else if (schema.additionalProperties === false) {
        push(out, strict, 'ERR_CONTRACT_UNEXPECTED', `${at || '/'} has unexpected property '${key}'`)
      } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        validateNode(schema.additionalProperties, v, `${at}/${key}`, out, strict)
      }
    }
  }
  if (Array.isArray(value) && schema.items) {
    value.forEach((v, i) => validateNode(schema.items, v, `${at}/${i}`, out, strict))
  }
}

function semanticChecks (contract, contractDir, errors) {
  const caps = contract.capabilities
  if (jsonType(caps) !== 'object') return

  for (const section of ['telemetry', 'commands']) {
    const entries = Array.isArray(caps[section]) ? caps[section] : []
    const seen = new Set()
    entries.forEach((entry, i) => {
      const at = `/capabilities/${section}/${i}`
      if (jsonType(entry) !== 'object') return
      if (entry.name) {
        if (seen.has(entry.name)) errors.push(`ERR_CONTRACT_DUPLICATE_NAME: ${at} '${entry.name}' already declared in ${section}`)
        seen.add(entry.name)
      }
      if (typeof entry.handler === 'string' && entry.handler) {
        const file = path.resolve(contractDir, entry.handler)
        if (!fs.existsSync(file)) errors.push(`ERR_CONTRACT_HANDLER_NOT_FOUND: ${at} handler '${entry.handler}' does not exist (resolved: ${file})`)
      }
    })
  }

  const commands = Array.isArray(caps.commands) ? caps.commands : []
  commands.forEach((cmd, i) => {
    if (jsonType(cmd) !== 'object' || !Array.isArray(cmd.params)) return
    cmd.params.forEach((p, j) => {
      if (jsonType(p) !== 'object' || p.type !== 'number') return
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

const args = process.argv.slice(2)
const schemaOnly = args.includes('--schema-only')
const strict = args.includes('--strict')
const target = args.find((a) => !a.startsWith('--'))
if (!target) {
  console.error('usage: node validate-contract.mjs [--strict] [--schema-only] <path/to/mdk-contract.json>')
  process.exit(1)
}

const contractPath = path.resolve(process.cwd(), target)
if (!fs.existsSync(contractPath)) {
  console.error(`ERR_CONTRACT_FILE_NOT_FOUND: ${contractPath}`)
  process.exit(1)
}

let contract
try {
  contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'))
} catch (err) {
  console.error(`ERR_CONTRACT_PARSE: ${contractPath}: ${err.message}`)
  process.exit(1)
}

const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'))
const out = { base: [], strict: [] }
validateNode(schema, contract, '', out, false)
if (!schemaOnly) semanticChecks(contract, path.dirname(contractPath), out.base)

const declared = jsonType(contract) === 'object' && typeof contract.contractVersion === 'string'
const strictAsErrors = strict || declared
const errors = strictAsErrors ? out.base.concat(out.strict) : out.base
const warnings = strictAsErrors ? [] : out.strict

for (const w of warnings) console.warn(`  warn  ${w}`)
if (errors.length) {
  console.error(`FAIL: ${target} — ${errors.length} problem(s):`)
  for (const err of errors) console.error(`  ${err}`)
  process.exit(1)
}

console.log(`OK: ${target} conforms to mdk-contract.schema.json${schemaOnly ? '' : ' (+ semantic checks)'}${warnings.length ? ` — ${warnings.length} v1 strictness warning(s), fix before contractVersion '1' or --strict` : ''}`)
