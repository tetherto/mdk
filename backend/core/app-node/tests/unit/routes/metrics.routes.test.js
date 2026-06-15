'use strict'

const test = require('brittle')
const { testModuleStructure, testHandlerFunctions, testOnRequestFunctions } = require('../helpers/routeTestHelpers')
const { createRoutesForTest } = require('../helpers/mockHelpers')

const ROUTES_PATH = '../../../workers/lib/server/routes/metrics.routes.js'

test('metrics routes - module structure', (t) => {
  testModuleStructure(t, ROUTES_PATH, 'metrics')
  t.pass()
})

test('metrics routes - route definitions', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)

  const routeUrls = routes.map(route => route.url)
  t.ok(routeUrls.includes('/auth/metrics/hashrate'), 'should have hashrate route')
  t.ok(routeUrls.includes('/auth/metrics/consumption'), 'should have consumption route')
  t.ok(routeUrls.includes('/auth/metrics/efficiency'), 'should have efficiency route')
  t.ok(routeUrls.includes('/auth/metrics/miner-status'), 'should have miner-status route')
  t.ok(routeUrls.includes('/auth/metrics/power-mode'), 'should have power-mode route')
  t.ok(routeUrls.includes('/auth/metrics/power-mode/timeline'), 'should have power-mode/timeline route')
  t.ok(routeUrls.includes('/auth/metrics/temperature'), 'should have temperature route')
  t.ok(routeUrls.includes('/auth/metrics/containers/:id'), 'should have container telemetry route')
  t.ok(routeUrls.includes('/auth/metrics/containers/:id/history'), 'should have container history route')

  t.pass()
})

test('metrics routes - HTTP methods', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)

  routes.forEach(route => {
    t.is(route.method, 'GET', `route ${route.url} should be GET`)
  })

  t.pass()
})

test('metrics routes - schema integration', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)

  const routesWithSchemas = routes.filter(route => route.schema)
  routesWithSchemas.forEach(route => {
    t.ok(route.schema, `route ${route.url} should have schema`)
    if (route.schema.querystring) {
      t.ok(typeof route.schema.querystring === 'object', `route ${route.url} querystring should be object`)
    }
  })

  t.pass()
})

test('metrics routes - handler functions', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)
  testHandlerFunctions(t, routes, 'metrics')
  t.pass()
})

test('metrics routes - onRequest functions', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)
  testOnRequestFunctions(t, routes, 'metrics')
  t.pass()
})
