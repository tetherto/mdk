'use strict'

const test = require('brittle')
const { testModuleStructure, testHandlerFunctions, testPreHandlerFunctions } = require('../helpers/routeTestHelpers')

test('settings routes - module structure', (t) => {
  testModuleStructure(t, '../../../workers/lib/server/routes/settings.routes.js', 'settings')
  t.pass()
})

test('settings routes - route definitions', (t) => {
  const mockCtx = {}
  const routes = require('../../../workers/lib/server/routes/settings.routes.js')(mockCtx)

  const routeUrls = routes.map(route => route.url)
  t.ok(routeUrls.includes('/auth/user/settings'), 'should have user settings route')

  t.pass()
})

test('settings routes - HTTP methods', (t) => {
  const mockCtx = {}
  const routes = require('../../../workers/lib/server/routes/settings.routes.js')(mockCtx)

  const getRoute = routes.find(r => r.url === '/auth/user/settings' && r.method === 'GET')
  t.ok(getRoute, 'should have GET route for user settings')

  const postRoute = routes.find(r => r.url === '/auth/user/settings' && r.method === 'POST')
  t.ok(postRoute, 'should have POST route for user settings')

  t.pass()
})

test('settings routes - schema validation', (t) => {
  const mockCtx = {}
  const routes = require('../../../workers/lib/server/routes/settings.routes.js')(mockCtx)

  const postRoute = routes.find(r => r.url === '/auth/user/settings' && r.method === 'POST')
  t.ok(postRoute.schema, 'POST route should have schema')
  t.ok(postRoute.schema.body, 'POST route should have body schema')
  t.ok(postRoute.schema.body.required.includes('settings'), 'settings should be required')

  t.pass()
})

test('settings routes - handler functions', (t) => {
  const mockCtx = {}
  const routes = require('../../../workers/lib/server/routes/settings.routes.js')(mockCtx)
  testHandlerFunctions(t, routes, 'settings')
  t.pass()
})

test('settings routes - preHandler functions', (t) => {
  const mockCtx = {}
  const routes = require('../../../workers/lib/server/routes/settings.routes.js')(mockCtx)
  testPreHandlerFunctions(t, routes, 'settings')
  t.pass()
})
