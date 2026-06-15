'use strict'

const { test } = require('brittle')
const libAlerts = require('../../lib/templates/alerts')

test('alerts has specs.container_default', (t) => {
  t.ok(libAlerts.specs, 'has specs')
  t.ok(libAlerts.specs.container_default !== undefined, 'container_default is set')
  t.ok(libAlerts.specs.default !== undefined, 'default is set')
})

test('container_default equals default', (t) => {
  t.is(libAlerts.specs.container_default, libAlerts.specs.default, 'container_default references default')
})
