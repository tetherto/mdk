'use strict'

const test = require('brittle')
const { testModuleStructure, testHandlerFunctions } = require('../helpers/routeTestHelpers')
const { createRoutesForTest } = require('../helpers/mockHelpers')

const ROUTES_PATH = '../../../workers/lib/server/routes/explorer.routes.js'

test('explorer routes - module structure', (t) => {
  testModuleStructure(t, ROUTES_PATH, 'explorer')
  t.pass()
})

test('explorer routes - route definitions', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)

  const routeUrls = routes.map(route => route.url)
  t.ok(routeUrls.includes('/auth/explorer/racks'), 'should have explorer racks route')

  t.pass()
})

test('explorer routes - HTTP methods', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)

  const racksRoute = routes.find(r => r.url === '/auth/explorer/racks')
  t.is(racksRoute.method, 'GET', 'racks route should be GET')

  t.pass()
})

test('explorer routes - schema validation', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)

  const racksRoute = routes.find(r => r.url === '/auth/explorer/racks')
  t.ok(racksRoute.schema, 'should have schema')
  t.ok(racksRoute.schema.querystring, 'should have querystring schema')

  const props = racksRoute.schema.querystring.properties
  t.is(props.group.type, 'string', 'group should be string')
  t.is(props.search.type, 'string', 'search should be string')
  t.is(props.sort.type, 'string', 'sort should be string')
  t.is(props.offset.type, 'integer', 'offset should be integer')
  t.is(props.limit.type, 'integer', 'limit should be integer')

  t.pass()
})

test('explorer routes - handler functions', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)
  testHandlerFunctions(t, routes, 'explorer')
  t.pass()
})

test('explorer routes - onRequest functions (auth)', (t) => {
  const routes = createRoutesForTest(ROUTES_PATH)

  routes.forEach(route => {
    t.ok(typeof route.onRequest === 'function', `explorer route ${route.url} should have onRequest function`)
  })

  t.pass()
})
