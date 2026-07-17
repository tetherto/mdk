'use strict'

const test = require('brittle')
const { testModuleStructure, testHandlerFunctions, testOnRequestFunctions } = require('../helpers/routeTestHelpers')
const { createRoutesForTest } = require('../helpers/mockHelpers')

const ROUTES_PATH = '../../../workers/lib/server/routes/groups.routes.js'

test('groups routes - module structure', (t) => {
  testModuleStructure(t, ROUTES_PATH, 'groups')
  t.pass()
})

test('groups routes - route definitions', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)

  const routeUrls = routes.map(route => route.url)
  t.ok(routeUrls.includes('/auth/miners/groups/stats'), 'should have miners groups stats route')

  t.pass()
})

test('groups routes - HTTP methods', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)

  routes.forEach(route => {
    t.is(route.method, 'GET', `route ${route.url} should be GET`)
  })

  t.pass()
})

test('groups routes - schema integration', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)

  routes.forEach(route => {
    t.ok(route.schema, `route ${route.url} should have schema`)
    t.ok(route.schema.querystring, `route ${route.url} should have querystring schema`)
    t.ok(typeof route.schema.querystring === 'object', `route ${route.url} querystring should be object`)
  })

  t.pass()
})

test('groups routes - handler functions', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)
  testHandlerFunctions(t, routes, 'groups')
  t.pass()
})

test('groups routes - onRequest functions', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)
  testOnRequestFunctions(t, routes, 'groups')
  t.pass()
})
