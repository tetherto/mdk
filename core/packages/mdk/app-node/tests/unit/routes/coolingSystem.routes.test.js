'use strict'

const test = require('brittle')
const { testModuleStructure, testHandlerFunctions } = require('../helpers/routeTestHelpers')
const { createRoutesForTest } = require('../helpers/mockHelpers')
const { ENDPOINTS } = require('../../../workers/lib/constants')

test('coolingSystem routes - module structure', (t) => {
  testModuleStructure(t, '../../../workers/lib/server/routes/coolingSystem.routes.js', 'coolingSystem')
  t.pass()
})

test('coolingSystem routes - route definitions', (t) => {
  const routes = createRoutesForTest('../../../workers/lib/server/routes/coolingSystem.routes.js')

  const routeUrls = routes.map(route => route.url)
  t.ok(routeUrls.includes(ENDPOINTS.COOLING_SYSTEM), 'should have cooling-system route')

  t.pass()
})

test('coolingSystem routes - HTTP methods', (t) => {
  const routes = createRoutesForTest('../../../workers/lib/server/routes/coolingSystem.routes.js')

  const coolingSystemRoute = routes.find(r => r.url === ENDPOINTS.COOLING_SYSTEM)
  t.ok(coolingSystemRoute, 'cooling-system route should exist')
  t.is(coolingSystemRoute.method, 'GET', 'cooling-system route should be GET')

  t.pass()
})

test('coolingSystem routes - schema validation', (t) => {
  const routes = createRoutesForTest('../../../workers/lib/server/routes/coolingSystem.routes.js')

  const coolingSystemRoute = routes.find(r => r.url === ENDPOINTS.COOLING_SYSTEM)
  t.ok(coolingSystemRoute, 'cooling-system route should exist')
  t.ok(coolingSystemRoute.schema, 'cooling-system route should have schema')
  t.ok(coolingSystemRoute.schema.querystring, 'should have querystring schema')
  t.ok(coolingSystemRoute.schema.querystring.required.includes('type'), 'type should be required')
  t.ok(coolingSystemRoute.schema.querystring.required.includes('view'), 'view should be required')
  t.ok(coolingSystemRoute.schema.querystring.properties.type.enum.includes('miners'), 'type enum should include miners')
  t.ok(coolingSystemRoute.schema.querystring.properties.type.enum.includes('hvac'), 'type enum should include hvac')
  t.ok(coolingSystemRoute.schema.querystring.properties.view.enum.includes('circuit1'), 'view enum should include circuit1')
  t.ok(coolingSystemRoute.schema.querystring.properties.view.enum.includes('circuit2'), 'view enum should include circuit2')
  t.ok(coolingSystemRoute.schema.querystring.properties.view.enum.includes('layout'), 'view enum should include layout')
  t.ok(coolingSystemRoute.schema.querystring.properties.view.enum.includes('ambient'), 'view enum should include ambient')
  t.is(coolingSystemRoute.schema.querystring.properties.overwriteCache.type, 'boolean', 'overwriteCache should be boolean')

  t.pass()
})

test('coolingSystem routes - handler functions', (t) => {
  const routes = createRoutesForTest('../../../workers/lib/server/routes/coolingSystem.routes.js')
  testHandlerFunctions(t, routes, 'coolingSystem')
  t.pass()
})

test('coolingSystem routes - onRequest functions', (t) => {
  const routes = createRoutesForTest('../../../workers/lib/server/routes/coolingSystem.routes.js')

  routes.forEach(route => {
    t.ok(typeof route.onRequest === 'function', `coolingSystem route ${route.url} should have onRequest function`)
  })

  t.pass()
})
