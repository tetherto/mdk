'use strict'

const test = require('brittle')
const { testModuleStructure, testHandlerFunctions, testOnRequestFunctions } = require('../helpers/routeTestHelpers')
const { createRoutesForTest } = require('../helpers/mockHelpers')

const ROUTES_PATH = '../../../workers/lib/server/routes/alerts.routes.js'

test('alerts routes - module structure', (t) => {
  testModuleStructure(t, ROUTES_PATH, 'alerts')
  t.pass()
})

test('alerts routes - route definitions', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)

  const routeUrls = routes.map(route => route.url)
  t.ok(routeUrls.includes('/auth/alerts/site'), 'should have site alerts route')
  t.ok(routeUrls.includes('/auth/alerts/history'), 'should have alerts history route')

  t.pass()
})

test('alerts routes - HTTP methods', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)

  routes.forEach(route => {
    t.is(route.method, 'GET', `route ${route.url} should be GET`)
  })

  t.pass()
})

test('alerts routes - schema integration', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)

  routes.forEach(route => {
    t.ok(route.schema, `route ${route.url} should have schema`)
    t.ok(typeof route.schema.querystring === 'object', `route ${route.url} querystring should be object`)
  })

  t.pass()
})

test('alerts routes - handler functions', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)
  testHandlerFunctions(t, routes, 'alerts')
  t.pass()
})

test('alerts routes - onRequest functions', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)
  testOnRequestFunctions(t, routes, 'alerts')
  t.pass()
})
