'use strict'

const test = require('brittle')
const PowerMeter = require('../../lib/powermeter')

test('calculateTension averages three phase-to-phase values', (t) => {
  const pm = new PowerMeter({})

  t.is(pm.calculateTension(230, 235, 240), (230 + 235 + 240) / 3)
})

test('calculateTension works with negatives', (t) => {
  const pm = new PowerMeter({})

  t.is(pm.calculateTension(-3, -6, 0), (-3 + -6 + 0) / 3)
})
