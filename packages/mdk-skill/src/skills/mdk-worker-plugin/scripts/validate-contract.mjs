#!/usr/bin/env node
// Validate a worker's mdk-contract.json against ../references/mdk-contract.schema.json.
//
//   node validate-contract.mjs <path/to/mdk-contract.json>                 # exit 0/1
//   node validate-contract.mjs --schema-only <path/to/mdk-contract.json>   # skip semantic checks
//
// Zero-dependency: implements the JSON Schema subset the schema uses, plus
// semantic checks the schema cannot express — handler files exist, names are
// unique, and number params declare min/max (the Kernel enforces
// ERR_PARAM_RANGE only for declared bounds).

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
  if (expected === 'array') return Array.isArray(v)
  if (expected === 'object') return jsonType(v) === 'object'
  return typeof v === expected
}

function validateNode (schema, value, at, errors) {
  if (schema.type && !matchesType(schema.type, value)) {
    errors.push(`ERR_CONTRACT_TYPE: ${at} expected ${schema.type}, got ${jsonType(value)}`)
    return
  }
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`ERR_CONTRACT_ENUM: ${at} is ${JSON.stringify(value)}, allowed: ${schema.enum.join(' | ')}`)
  }
  if (jsonType(value) === 'object') {
    for (const key of schema.required || []) {
      if (!(key in value)) errors.push(`ERR_CONTRACT_REQUIRED: ${at} missing required property '${key}'`)
    }
    const props = schema.properties || {}
    for (const [key, v] of Object.entries(value)) {
      if (props[key]) {
        validateNode(props[key], v, `${at}/${key}`, errors)
      } else if (schema.additionalProperties === false) {
        errors.push(`ERR_CONTRACT_UNEXPECTED: ${at} has unexpected property '${key}'`)
      } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        validateNode(schema.additionalProperties, v, `${at}/${key}`, errors)
      }
    }
  }
  if (Array.isArray(value) && schema.items) {
    value.forEach((v, i) => validateNode(schema.items, v, `${at}/${i}`, errors))
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
      if (typeof p.min !== 'number' || typeof p.max !== 'number') {
        errors.push(`ERR_CONTRACT_PARAM_BOUNDS_MISSING: ${at} ('${cmd.name}'.'${p.name}') — number params must declare min and max so the Kernel can enforce ERR_PARAM_RANGE`)
      } else if (p.min > p.max) {
        errors.push(`ERR_CONTRACT_PARAM_BOUNDS_INVALID: ${at} min ${p.min} > max ${p.max}`)
      }
    })
  })
}

const args = process.argv.slice(2)
const schemaOnly = args.includes('--schema-only')
const target = args.find((a) => !a.startsWith('--'))
if (!target) {
  console.error('usage: node validate-contract.mjs [--schema-only] <path/to/mdk-contract.json>')
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
const errors = []
validateNode(schema, contract, '', errors)
if (!schemaOnly) semanticChecks(contract, path.dirname(contractPath), errors)

if (errors.length) {
  console.error(`FAIL: ${target} — ${errors.length} problem(s):`)
  for (const err of errors) console.error(`  ${err}`)
  process.exit(1)
}

console.log(`OK: ${target} conforms to mdk-contract.schema.json${schemaOnly ? '' : ' (+ semantic checks)'}`)
