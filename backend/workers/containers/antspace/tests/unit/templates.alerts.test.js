'use strict'

const { test } = require('brittle')
const libAlerts = require('../../lib/templates/alerts')

test('alerts module exports specs', (t) => {
  t.ok(libAlerts.specs, 'specs exists')
})

test('alerts specs.container extends container_default', (t) => {
  t.ok(libAlerts.specs.container !== undefined, 'container spec defined')
  t.ok(libAlerts.specs.container_default !== undefined, 'container_default from base')
})

test('alerts specs.container has supply_liquid_temp_low', (t) => {
  t.ok(libAlerts.specs.container.supply_liquid_temp_low, 'supply_liquid_temp_low defined')
  t.is(typeof libAlerts.specs.container.supply_liquid_temp_low.valid, 'function', 'valid is function')
  t.is(typeof libAlerts.specs.container.supply_liquid_temp_low.probe, 'function', 'probe is function')
})
