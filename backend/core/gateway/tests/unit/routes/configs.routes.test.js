'use strict'

const test = require('brittle')
const { testModuleStructure, testHandlerFunctions, testOnRequestFunctions } = require('../helpers/routeTestHelpers')
const { createRoutesForTest } = require('../helpers/mockHelpers')

const ROUTES_PATH = '../../../workers/lib/server/routes/configs.routes.js'

test('configs routes - module structure', (t) => {
  testModuleStructure(t, ROUTES_PATH, 'configs')
  t.pass()
})

test('configs routes - route definitions', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)
  const routeUrls = routes.map(route => route.url)
  t.ok(routeUrls.includes('/auth/configs/:type'), 'should have configs route')
  t.pass()
})

test('configs routes - HTTP methods', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)
  routes.forEach(route => {
    t.is(route.method, 'GET', `route ${route.url} should be GET`)
  })
  t.pass()
})

test('configs routes - handler functions', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)
  testHandlerFunctions(t, routes, 'configs')
  t.pass()
})

test('configs routes - onRequest functions', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)
  testOnRequestFunctions(t, routes, 'configs')
  t.pass()
})

test('configs routes - schema validation', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)
  const configsRoute = routes.find(r => r.url === '/auth/configs/:type')

  t.ok(configsRoute.schema, 'should have schema')
  t.ok(configsRoute.schema.params, 'should have params schema')
  t.ok(configsRoute.schema.params.properties.type, 'should have type param')
  t.ok(configsRoute.schema.params.required.includes('type'), 'type should be required')

  t.ok(configsRoute.schema.querystring, 'should have querystring schema')
  t.ok(configsRoute.schema.querystring.properties.query, 'should have query property')
  t.ok(configsRoute.schema.querystring.properties.fields, 'should have fields property')
  t.ok(configsRoute.schema.querystring.properties.overwriteCache, 'should have overwriteCache property')
  t.pass()
})
