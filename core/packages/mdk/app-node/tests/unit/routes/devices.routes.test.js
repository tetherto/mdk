'use strict'

const test = require('brittle')
const { testModuleStructure, testHandlerFunctions, testOnRequestFunctions } = require('../helpers/routeTestHelpers')
const { createRoutesForTest } = require('../helpers/mockHelpers')
const schemas = require('../../../workers/lib/server/schemas/devices.schemas.js')

const ROUTES_PATH = '../../../workers/lib/server/routes/devices.routes.js'

test('devices routes - module structure', (t) => {
  testModuleStructure(t, ROUTES_PATH, 'devices')
  t.pass()
})

test('devices routes - route definitions', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)
  const routeUrls = routes.map(route => route.url)
  t.ok(routeUrls.includes('/auth/containers'), 'should have containers route')
  t.ok(routeUrls.includes('/auth/cabinets'), 'should have cabinets route')
  t.ok(routeUrls.includes('/auth/cabinets/:id'), 'should have cabinet by id route')
  t.pass()
})

test('devices routes - HTTP methods', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)
  routes.forEach(route => {
    t.is(route.method, 'GET', `route ${route.url} should be GET`)
  })
  t.pass()
})

test('devices routes - handler functions', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)
  testHandlerFunctions(t, routes, 'devices')
  t.pass()
})

test('devices routes - onRequest functions', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)
  testOnRequestFunctions(t, routes, 'devices')
  t.pass()
})

test('devices routes - schemas enforce limit maximum of 100', (t) => {
  const schemaNames = ['containers', 'cabinets']
  for (const name of schemaNames) {
    const schema = schemas.query[name]
    t.ok(schema.properties.limit, `${name} schema should have limit property`)
    t.is(schema.properties.limit.maximum, 100, `${name} limit maximum should be 100`)
    t.is(schema.properties.limit.minimum, 1, `${name} limit minimum should be 1`)
  }
  t.pass()
})

test('devices routes - schemas have querystring on routes', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)
  const containersRoute = routes.find(r => r.url === '/auth/containers')
  const cabinetsRoute = routes.find(r => r.url === '/auth/cabinets')

  t.ok(containersRoute.schema.querystring, 'containers route should have querystring schema')
  t.ok(cabinetsRoute.schema.querystring, 'cabinets route should have querystring schema')
  t.pass()
})
