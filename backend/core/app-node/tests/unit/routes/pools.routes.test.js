'use strict'

const test = require('brittle')
const { testModuleStructure, testHandlerFunctions, testOnRequestFunctions } = require('../helpers/routeTestHelpers')
const { createRoutesForTest } = require('../helpers/mockHelpers')

const ROUTES_PATH = '../../../workers/lib/server/routes/pools.routes.js'
const POOLS_CONFIG_ROUTE_URL = '/auth/pools/config/:id'
const POOLS_STATS_CONTAINERS_ROUTE_URL = '/auth/pools/stats/containers'

test('pools routes - module structure', (t) => {
  testModuleStructure(t, ROUTES_PATH, 'pools')
  t.pass()
})

test('pools routes - route definitions', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)
  const routeUrls = routes.map(route => route.url)
  t.ok(routeUrls.includes('/auth/pools'), 'should have pools route')
  t.ok(routeUrls.includes('/auth/pools/:pool/balance-history'), 'should have balance-history route')
  t.ok(routeUrls.includes('/auth/pools/config/:id'), 'should have pools thing config route')
  t.ok(routeUrls.includes('/auth/pools/stats/containers'), 'should have pools stats containers route')
  t.pass()
})

test('pools routes - HTTP methods', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)
  routes.forEach(route => {
    t.is(route.method, 'GET', `route ${route.url} should be GET`)
  })
  t.pass()
})

test('pools routes - handler functions', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)
  testHandlerFunctions(t, routes, 'pools')
  t.pass()
})

test('pools routes - onRequest functions', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)
  testOnRequestFunctions(t, routes, 'pools')
  t.pass()
})

test('pools routes - GET /auth/pools/config/:id (pools thing config)', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)
  const configRoute = routes.find(r => r.url === POOLS_CONFIG_ROUTE_URL)
  t.ok(configRoute, 'should have pools thing config route')
  t.is(configRoute.method, 'GET', 'pools config route should be GET')
  t.ok(typeof configRoute.handler === 'function', 'pools config route should have handler')
  t.ok(typeof configRoute.onRequest === 'function', 'pools config route should have onRequest (auth)')
  t.pass()
})

test('pools routes - GET /auth/pools/stats/containers', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)
  const statsRoute = routes.find(r => r.url === POOLS_STATS_CONTAINERS_ROUTE_URL)
  t.ok(statsRoute, 'should have pools stats containers route')
  t.is(statsRoute.method, 'GET', 'pools stats containers route should be GET')
  t.ok(typeof statsRoute.handler === 'function', 'pools stats containers route should have handler')
  t.ok(typeof statsRoute.onRequest === 'function', 'pools stats containers route should have onRequest (auth)')
  t.pass()
})
