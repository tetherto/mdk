'use strict'

const { test } = require('brittle')
const { ERROR_MAP } = require('../../lib/utils/constants')

test('ERROR_MAP has name and message for each entry', (t) => {
  for (const [raw, mapped] of Object.entries(ERROR_MAP)) {
    t.ok(mapped.name, `entry "${raw}" has name`)
    t.ok(mapped.message, `entry "${raw}" has message`)
    t.is(typeof mapped.name, 'string', `entry "${raw}" name is string`)
    t.is(typeof mapped.message, 'string', `entry "${raw}" message is string`)
  }
})

test('ERROR_MAP oil pump errors', (t) => {
  t.is(ERROR_MAP['OilPump1 error'].name, 'oil_pump_error', 'OilPump1 error name')
  t.is(ERROR_MAP['OilPump2 error'].name, 'oil_pump_error', 'OilPump2 error name')
})

test('ERROR_MAP water pump errors', (t) => {
  t.is(ERROR_MAP['WaterPump1 error'].name, 'water_pump_error', 'WaterPump1 error name')
  t.is(ERROR_MAP['WaterPump2 error'].name, 'water_pump_error', 'WaterPump2 error name')
})

test('ERROR_MAP tank overheat errors', (t) => {
  t.is(ERROR_MAP['Tank1 hot oil overheat'].name, 'hot_oil_overheat', 'Tank1 hot oil')
  t.is(ERROR_MAP['Tank1 cool oil overheat'].name, 'cold_oil_overheat', 'Tank1 cool oil')
  t.is(ERROR_MAP['Tank2 hot water overheat'].name, 'hot_water_overheat', 'Tank2 hot water')
})

test('ERROR_MAP not running errors', (t) => {
  t.is(ERROR_MAP['OilPump1 not running'].name, 'oil_pump_not_running', 'OilPump1 not running')
  t.is(ERROR_MAP['WaterPump2 not running'].name, 'water_pump_not_running', 'WaterPump2 not running')
})
