'use strict'

const test = require('brittle')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { validateContract } = require('../../lib/contract-validator')

function contract (overrides = {}) {
  return {
    contractVersion: '1',
    metadata: {
      provider: 'test',
      deviceFamily: 'miner',
      brand: 'Test',
      modelsSupported: ['T1'],
      overview: 'Test device.'
    },
    capabilities: {
      telemetry: [
        { name: 'hashrate', type: 'number', unit: 'TH/s', handler: 'handlers/hashrate.js', description: 'TH/s' }
      ],
      commands: [
        {
          name: 'setPowerLimit',
          handler: 'handlers/set-power-limit.js',
          params: [{ name: 'watts', type: 'number', min: 100, max: 3500 }]
        }
      ],
      health: { supportedStates: ['OK'] },
      errors: {}
    },
    ...overrides
  }
}

function legacy () {
  const c = contract()
  delete c.contractVersion
  return c
}

test('a conforming v1 contract passes with no warnings', (t) => {
  const { ok, errors, warnings } = validateContract(contract())
  t.ok(ok)
  t.alike(errors, [])
  t.alike(warnings, [])
})

test('missing metadata and capabilities are required-property errors', (t) => {
  const { ok, errors } = validateContract({ contractVersion: '1' })
  t.not(ok)
  t.ok(errors.some((e) => e.startsWith('ERR_CONTRACT_REQUIRED') && e.includes("'metadata'")))
  t.ok(errors.some((e) => e.startsWith('ERR_CONTRACT_REQUIRED') && e.includes("'capabilities'")))
})

test('a non-object contract reports a type error without throwing', (t) => {
  for (const bad of [null, 'contract', 7, []]) {
    const { ok, errors } = validateContract(bad)
    t.not(ok)
    t.ok(errors.some((e) => e.startsWith('ERR_CONTRACT_TYPE')))
  }
})

test('a legacy contract gets the v1 requirements as warnings, not errors', (t) => {
  const c = legacy()
  delete c.capabilities.telemetry[0].unit
  delete c.capabilities.commands[0].params[0].max
  const { ok, errors, warnings } = validateContract(c)
  t.ok(ok)
  t.alike(errors, [])
  t.ok(warnings.some((w) => w.includes("'contractVersion'")))
  t.ok(warnings.some((w) => w.includes("'unit'")))
  t.ok(warnings.some((w) => w.includes("'max'")))
})

test('strict mode turns legacy warnings into errors', (t) => {
  const c = legacy()
  delete c.capabilities.telemetry[0].unit
  const { ok, errors, warnings } = validateContract(c, { strict: true })
  t.not(ok)
  t.alike(warnings, [])
  t.ok(errors.some((e) => e.includes("'contractVersion'")))
  t.ok(errors.some((e) => e.includes("'unit'")))
})

test('a declared v1 contract is held to v1 as errors', (t) => {
  const missingUnit = contract()
  delete missingUnit.capabilities.telemetry[0].unit
  t.ok(validateContract(missingUnit).errors.some((e) => e.startsWith('ERR_CONTRACT_REQUIRED') && e.includes("'unit'")))

  const missingBounds = contract()
  delete missingBounds.capabilities.commands[0].params[0].max
  t.ok(validateContract(missingBounds).errors.some((e) => e.startsWith('ERR_CONTRACT_REQUIRED') && e.includes("'max'")))
})

test('a non-string unit stays a base error even on a legacy contract', (t) => {
  const c = legacy()
  c.capabilities.telemetry[0].unit = 5
  const { ok, errors } = validateContract(c)
  t.not(ok)
  t.ok(errors.some((e) => e.startsWith('ERR_CONTRACT_TYPE') && e.includes('/unit')))
})

test('units outside the canonical vocabulary are strict-tier', (t) => {
  const c = contract()
  c.capabilities.telemetry[0].unit = 'THs'
  const v1 = validateContract(c)
  t.not(v1.ok)
  t.ok(v1.errors.some((e) => e.startsWith('ERR_CONTRACT_ENUM') && e.includes('/unit')))

  const old = legacy()
  old.capabilities.telemetry[0].unit = 'THs'
  const l = validateContract(old)
  t.ok(l.ok)
  t.ok(l.warnings.some((w) => w.startsWith('ERR_CONTRACT_ENUM') && w.includes('/unit')))
})

test('declaring any contractVersion opts into strict: unknown value errors alongside body problems', (t) => {
  const c = contract({ contractVersion: '9' })
  delete c.capabilities.telemetry[0].unit
  const { ok, errors, warnings } = validateContract(c)
  t.not(ok)
  t.alike(warnings, [])
  t.ok(errors.some((e) => e.startsWith('ERR_CONTRACT_ENUM') && e.includes('/contractVersion')))
  t.ok(errors.some((e) => e.includes("'unit'")), 'body problems are not masked by the unknown version')
})

test('non-number telemetry and params need no unit or bounds under v1', (t) => {
  const c = contract()
  c.capabilities.telemetry.push({ name: 'status', type: 'string', handler: 'handlers/hashrate.js', description: 's' })
  c.capabilities.commands[0].params.push({ name: 'mode', type: 'string' })
  const { ok, errors, warnings } = validateContract(c)
  t.ok(ok, errors.join('; '))
  t.alike(warnings, [])
})

test('telemetry type outside the enum is rejected', (t) => {
  const c = contract()
  c.capabilities.telemetry[0].type = 'float'
  const { ok, errors } = validateContract(c)
  t.not(ok)
  t.ok(errors.some((e) => e.startsWith('ERR_CONTRACT_ENUM') && e.includes('/capabilities/telemetry/0/type')))
})

test('unexpected top-level properties are rejected', (t) => {
  const { ok, errors } = validateContract(contract({ transport: 'hrpc' }))
  t.not(ok)
  t.ok(errors.some((e) => e.startsWith('ERR_CONTRACT_UNEXPECTED') && e.includes("'transport'")))
})

test('duplicate names within a section are a semantic error', (t) => {
  const c = contract()
  c.capabilities.telemetry.push({ ...c.capabilities.telemetry[0] })
  const { ok, errors } = validateContract(c)
  t.not(ok)
  t.ok(errors.some((e) => e.startsWith('ERR_CONTRACT_DUPLICATE_NAME') && e.includes("'hashrate'")))
})

test('incoherent bounds and defaults are base errors', (t) => {
  const inverted = contract()
  inverted.capabilities.commands[0].params[0].min = 4000
  t.ok(validateContract(inverted).errors.some((e) => e.startsWith('ERR_CONTRACT_PARAM_BOUNDS_INVALID')))

  const badDefault = contract()
  badDefault.capabilities.commands[0].params[0].default = 5000
  t.ok(validateContract(badDefault).errors.some((e) => e.startsWith('ERR_CONTRACT_DEFAULT_RANGE')))

  const goodDefault = contract()
  goodDefault.capabilities.commands[0].params[0].default = 200
  t.ok(validateContract(goodDefault).ok)
})

test('semantic: false keeps schema conformance only', (t) => {
  const c = contract()
  c.capabilities.telemetry.push({ ...c.capabilities.telemetry[0] })
  const { ok, errors } = validateContract(c, { semantic: false })
  t.ok(ok)
  t.alike(errors, [])
})

test('handler existence is checked only when dir is given', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-contract-validator-'))
  t.teardown(() => fs.rmSync(dir, { recursive: true, force: true }))

  const c = contract()
  t.ok(validateContract(c).ok)

  const withDir = validateContract(c, { dir })
  t.not(withDir.ok)
  t.is(withDir.errors.filter((e) => e.startsWith('ERR_CONTRACT_HANDLER_NOT_FOUND')).length, 2)

  fs.mkdirSync(path.join(dir, 'handlers'))
  fs.writeFileSync(path.join(dir, 'handlers', 'hashrate.js'), 'module.exports = () => 1\n')
  fs.writeFileSync(path.join(dir, 'handlers', 'set-power-limit.js'), 'module.exports = () => true\n')
  t.ok(validateContract(c, { dir }).ok)
})
