'use strict'

const test = require('brittle')
const { testModuleStructure, testHandlerFunctions } = require('../helpers/routeTestHelpers')
const { createRoutesForTest } = require('../helpers/mockHelpers')

const ROUTES_PATH = '../../../workers/lib/server/routes/miners.routes.js'

test('miners routes - module structure', (t) => {
  testModuleStructure(t, ROUTES_PATH, 'miners')
  t.pass()
})

test('miners routes - route definitions', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)

  const routeUrls = routes.map(route => route.url)
  t.ok(routeUrls.includes('/auth/miners'), 'should have miners route')

  t.pass()
})

test('miners routes - HTTP methods', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)

  const minersRoute = routes.find(r => r.url === '/auth/miners')
  t.is(minersRoute.method, 'GET', 'miners route should be GET')

  t.pass()
})

test('miners routes - schema validation', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)

  const minersRoute = routes.find(r => r.url === '/auth/miners')
  t.ok(minersRoute.schema, 'should have schema')
  t.ok(minersRoute.schema.querystring, 'should have querystring schema')

  const props = minersRoute.schema.querystring.properties
  t.is(props.filter.type, 'string', 'filter should be string')
  t.is(props.sort.type, 'string', 'sort should be string')
  t.is(props.fields.type, 'string', 'fields should be string')
  t.is(props.search.type, 'string', 'search should be string')
  t.is(props.offset.type, 'integer', 'offset should be integer')
  t.is(props.limit.type, 'integer', 'limit should be integer')

  t.pass()
})

test('miners routes - handler functions', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)
  testHandlerFunctions(t, routes, 'miners')
  t.pass()
})

test('miners routes - onRequest functions (auth)', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)

  routes.forEach(route => {
    t.ok(typeof route.onRequest === 'function', `miners route ${route.url} should have onRequest function`)
  })

  t.pass()
})
