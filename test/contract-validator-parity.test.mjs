// The shared validator (backend/core/mdk-worker/lib/contract-validator.js)
// implements only the JSON Schema subset mdk-contract.schema.json uses. If the
// schema ever grows a feature outside that subset, the subset validator would
// silently pass what ajv rejects — this suite pins the two to the same verdict
// on every in-repo contract and on synthetic non-conforming ones. ajv checks
// the full v1 schema, so the subset side runs strict (version gating off).

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const Ajv = require('ajv/dist/2020')
const { validateContract, SCHEMA_PATH } = require('../backend/core/mdk-worker/lib/contract-validator')

const WORKERS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'backend', 'workers')

function findContracts (dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) findContracts(full, acc)
    else if (entry.name === 'mdk-contract.json') acc.push(full)
  }
  return acc
}

function ajvValidator () {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'))
  return new Ajv({ allErrors: true, strict: false }).compile(schema)
}

test('strict subset validator agrees with ajv on every in-repo contract', () => {
  const ajv = ajvValidator()
  const contracts = findContracts(WORKERS_ROOT)
  assert.ok(contracts.length > 0)
  for (const file of contracts) {
    // Stamped before both calls: unstamped, every legacy contract fails both
    // validators on the missing contractVersion alone and the comparison would
    // be vacuously equal without exercising any body rule.
    const contract = { contractVersion: '1', ...JSON.parse(fs.readFileSync(file, 'utf8')) }
    const subset = validateContract(contract, { semantic: false, strict: true }).ok
    assert.equal(subset, ajv(contract), path.relative(WORKERS_ROOT, file))
  }
})

test('every in-repo legacy contract still passes in warn mode', () => {
  for (const file of findContracts(WORKERS_ROOT)) {
    const contract = JSON.parse(fs.readFileSync(file, 'utf8'))
    const { ok, errors } = validateContract(contract, { semantic: false })
    assert.ok(ok, `${path.relative(WORKERS_ROOT, file)}: ${errors.join('; ')}`)
  }
})

test('strict subset validator agrees with ajv on synthetic non-conforming contracts', () => {
  const ajv = ajvValidator()
  // base() is normalized v1-clean so BOTH validators accept it unmutated —
  // otherwise every case would be rejected on the base contract's own gaps
  // before its mutation matters, and a missing subset feature (if/then, const,
  // minimum) could never flip a verdict.
  const base = () => {
    const c = { contractVersion: '1', ...JSON.parse(fs.readFileSync(findContracts(WORKERS_ROOT)[0], 'utf8')) }
    for (const entry of c.capabilities.telemetry || []) {
      if (entry.type === 'number') entry.unit = 'W'
      else delete entry.unit
    }
    for (const cmd of c.capabilities.commands || []) {
      for (const p of cmd.params || []) {
        if (p.type === 'number') { p.min = 0; p.max = 100; delete p.default }
      }
    }
    return c
  }

  const clean = base()
  assert.ok(ajv(clean), 'normalized base passes ajv')
  assert.ok(validateContract(clean, { semantic: false, strict: true }).ok, 'normalized base passes strict subset')

  const cases = [
    ['missing metadata', (c) => { delete c.metadata }],
    ['missing capabilities.health', (c) => { delete c.capabilities.health }],
    ['unexpected top-level key', (c) => { c.transport = 'hrpc' }],
    ['telemetry type outside enum', (c) => { c.capabilities.telemetry[0].type = 'float' }],
    ['telemetry entry missing description', (c) => { delete c.capabilities.telemetry[0].description }],
    ['params not an array', (c) => { c.capabilities.commands[0].params = {} }],
    ['errors map with non-string value', (c) => { c.capabilities.errors = { E1: 7 } }],
    ['modelsSupported with non-string item', (c) => { c.metadata.modelsSupported = [1] }],
    ['number telemetry without unit', (c) => { c.capabilities.telemetry.forEach((e) => { if (e.type === 'number') delete e.unit }) }],
    ['unit outside the vocabulary', (c) => { c.capabilities.telemetry[0].unit = 'THs' }],
    ['unit with a non-string value', (c) => { c.capabilities.telemetry[0].unit = 5 }],
    ['unknown contractVersion', (c) => { c.contractVersion = '9' }],
    ['verify readback window below minimum', (c) => {
      c.capabilities.commands[0].verify = { telemetry: c.capabilities.telemetry[0].name, param: 'x', withinMs: 0 }
    }]
  ]

  for (const [label, mutate] of cases) {
    const contract = base()
    mutate(contract)
    const subset = validateContract(contract, { semantic: false, strict: true }).ok
    assert.equal(subset, ajv(contract), label)
    assert.equal(subset, false, label + ' rejects')
  }
})
