'use strict'

const test = require('brittle')

const alerts = require('../../lib/templates/alerts')
const stats = require('../../lib/templates/stats')

test('alerts template exposes powermeter_default spec', (t) => {
  t.ok(alerts && alerts.specs && alerts.specs.powermeter_default)
  t.alike(typeof alerts.specs.powermeter_default, 'object')
})

test('stats template wires powermeter_default ops from default ops', (t) => {
  t.ok(stats && stats.specs && stats.specs.powermeter_default)
  t.alike(stats.specs.powermeter_default.ops, stats.specs.default.ops)
})
