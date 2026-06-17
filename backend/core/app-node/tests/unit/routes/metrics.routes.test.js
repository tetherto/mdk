'use strict'

const test = require('brittle')
const path = require('path')
const { loadPlugin } = require('../../../workers/lib/plugin-loader')

const PLUGIN_DIR = path.join(__dirname, '../../../../plugins/telemetry')

test('telemetry plugin - loads without error', (t) => {
  const plugin = loadPlugin(PLUGIN_DIR)
  t.ok(plugin.manifest.name, 'should have name')
  t.ok(Array.isArray(plugin.routes), 'should have routes array')
  t.pass()
})

test('telemetry plugin - declares all expected routes', (t) => {
  const plugin = loadPlugin(PLUGIN_DIR)
  const routePaths = plugin.routes.map(r => r.path)

  t.ok(routePaths.includes('/auth/metrics/hashrate'), 'should have hashrate route')
  t.ok(routePaths.includes('/auth/metrics/consumption'), 'should have consumption route')
  t.ok(routePaths.includes('/auth/metrics/efficiency'), 'should have efficiency route')
  t.ok(routePaths.includes('/auth/metrics/miner-status'), 'should have miner-status route')
  t.ok(routePaths.includes('/auth/metrics/power-mode'), 'should have power-mode route')
  t.ok(routePaths.includes('/auth/metrics/power-mode/timeline'), 'should have power-mode/timeline route')
  t.ok(routePaths.includes('/auth/metrics/temperature'), 'should have temperature route')
  t.ok(routePaths.includes('/auth/metrics/containers/:id'), 'should have container telemetry route')
  t.ok(routePaths.includes('/auth/metrics/containers/:id/history'), 'should have container history route')
  t.pass()
})

test('telemetry plugin - all routes use GET', (t) => {
  const plugin = loadPlugin(PLUGIN_DIR)
  for (const route of plugin.routes) {
    t.is(route.method, 'GET', `route ${route.path} should be GET`)
  }
  t.pass()
})

test('telemetry plugin - all routes have auth enabled', (t) => {
  const plugin = loadPlugin(PLUGIN_DIR)
  for (const route of plugin.routes) {
    t.ok(route.auth, `route ${route.path} should require auth`)
  }
  t.pass()
})

test('telemetry plugin - all routes have a loaded handler function', (t) => {
  const plugin = loadPlugin(PLUGIN_DIR)
  for (const route of plugin.routes) {
    t.is(typeof route._handler, 'function', `route ${route.id} should have a loaded handler`)
  }
  t.pass()
})

test('telemetry plugin - all routes have cache config', (t) => {
  const plugin = loadPlugin(PLUGIN_DIR)
  for (const route of plugin.routes) {
    t.ok(Array.isArray(route.cache), `route ${route.id} should have cache field list`)
  }
  t.pass()
})
