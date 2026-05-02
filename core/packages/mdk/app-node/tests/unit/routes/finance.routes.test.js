'use strict'

const test = require('brittle')
const { testModuleStructure, testHandlerFunctions, testOnRequestFunctions } = require('../helpers/routeTestHelpers')
const { createRoutesForTest } = require('../helpers/mockHelpers')

const ROUTES_PATH = '../../../workers/lib/server/routes/finance.routes.js'

test('finance routes - module structure', (t) => {
  testModuleStructure(t, ROUTES_PATH, 'finance')
  t.pass()
})

test('finance routes - route definitions', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)

  const routeUrls = routes.map(route => route.url)
  t.ok(routeUrls.includes('/auth/finance/energy-balance'), 'should have energy-balance route')
  t.ok(routeUrls.includes('/auth/finance/ebitda'), 'should have ebitda route')
  t.ok(routeUrls.includes('/auth/finance/cost-summary'), 'should have cost-summary route')
  t.ok(routeUrls.includes('/auth/finance/subsidy-fees'), 'should have subsidy-fees route')
  t.ok(routeUrls.includes('/auth/finance/revenue'), 'should have revenue route')
  t.ok(routeUrls.includes('/auth/finance/revenue-summary'), 'should have revenue-summary route')
  t.ok(routeUrls.includes('/auth/finance/hash-revenue'), 'should have hash-revenue route')

  t.pass()
})

test('finance routes - HTTP methods', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)

  routes.forEach(route => {
    t.is(route.method, 'GET', `route ${route.url} should be GET`)
  })

  t.pass()
})

test('finance routes - schema integration', (t) => {
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

test('finance routes - handler functions', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)
  testHandlerFunctions(t, routes, 'finance')
  t.pass()
})

test('finance routes - onRequest functions', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)
  testOnRequestFunctions(t, routes, 'finance')
  t.pass()
})
