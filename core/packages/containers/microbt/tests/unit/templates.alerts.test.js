'use strict'

const { test } = require('brittle')
const libAlerts = require('../../lib/templates/alerts')

test('alerts module exports specs', (t) => {
  t.ok(libAlerts.specs, 'specs exists')
})

test('alerts specs.container is set from container_default', (t) => {
  t.ok(libAlerts.specs.container !== undefined, 'container spec defined')
  t.ok(libAlerts.specs.container_default !== undefined, 'container_default from base')
  t.ok(libAlerts.specs.container === libAlerts.specs.container_default, 'container aliases container_default')
})
