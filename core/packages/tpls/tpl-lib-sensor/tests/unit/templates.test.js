'use strict'

const test = require('brittle')
const libThingStats = require('../../../tpl-lib-thing/lib/templates/stats')
const libThingUtils = require('../../../tpl-lib-thing/lib/utils')
const libThingAlerts = require('../../../tpl-lib-thing/lib/templates/alerts')
const stats = require('../../lib/templates/stats')
const alerts = require('../../lib/templates/alerts')
const utils = require('../../lib/utils')

test('utils re-exports tpl-lib-thing utils', (t) => {
  t.is(utils, libThingUtils)
})

test('alerts re-exports tpl-lib-thing alerts', (t) => {
  t.is(alerts, libThingAlerts)
})

test('stats extends default spec with sensor_default', (t) => {
  t.is(stats, libThingStats)
  t.ok(stats.specs.sensor_default)
  t.alike(stats.specs.sensor_default.ops, stats.specs.default.ops)
})
