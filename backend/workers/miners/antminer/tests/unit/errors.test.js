'use strict'

const test = require('brittle')
const { ErrorMap } = require('../../lib/utils/errors.js')

test('ErrorMap maps known error codes to names', (t) => {
  t.is(ErrorMap['R:1'], 'hashrate_low')
  t.is(ErrorMap['N:1'], 'hashrate_high')
  t.is(ErrorMap['V:1'], 'power_init_error')
  t.is(ErrorMap['P:1'], 'high_temp_protection')
  t.is(ErrorMap['P:2'], 'low_temp_protection')
  t.is(ErrorMap['J0:8'], 'insufficient_hashboards')
  t.is(ErrorMap['L255:2'], 'mixed_level_not_found')
})

test('ErrorMap has expected number of entries', (t) => {
  const count = Object.keys(ErrorMap).length
  t.ok(count >= 20, 'has at least 20 error code mappings')
})

test('ErrorMap values are non-empty strings', (t) => {
  for (const [code, name] of Object.entries(ErrorMap)) {
    t.ok(typeof name === 'string' && name.length > 0, `${code} maps to non-empty string`)
  }
})
