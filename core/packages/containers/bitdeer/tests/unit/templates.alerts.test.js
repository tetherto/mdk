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

test('alerts specs.container has oil_min_inlet_temp_warn', (t) => {
  t.ok(libAlerts.specs.container.oil_min_inlet_temp_warn, 'oil_min_inlet_temp_warn defined')
  t.is(typeof libAlerts.specs.container.oil_min_inlet_temp_warn.valid, 'function', 'valid is function')
  t.is(typeof libAlerts.specs.container.oil_min_inlet_temp_warn.probe, 'function', 'probe is function')
})
