'use strict'

const { test } = require('brittle')
const { SystemErrorMap, GeneralErrorMap } = require('../../lib/utils/errormap')

test('SystemErrorMap has expected error names', (t) => {
  t.is(SystemErrorMap[0], 'low_inlet_pressure_circ_pump', 'index 0')
  t.is(SystemErrorMap[3], 'circulating_pump_fault', 'index 3')
  t.is(SystemErrorMap[24], 'circ_pump_high_inlet_pressure', 'index 24')
})

test('SystemErrorMap has 25 entries', (t) => {
  const keys = Object.keys(SystemErrorMap).map(Number).filter(n => !Number.isNaN(n))
  t.is(keys.length, 25, '25 entries')
})

test('GeneralErrorMap has expected error names', (t) => {
  t.is(GeneralErrorMap[0], 'outdoor_ambient_temp_sensor_fault', 'index 0')
  t.is(GeneralErrorMap[4], 'water_immersion_alarm', 'index 4')
})

test('GeneralErrorMap has 5 entries', (t) => {
  const keys = Object.keys(GeneralErrorMap).map(Number).filter(n => !Number.isNaN(n))
  t.is(keys.length, 5, '5 entries')
})
