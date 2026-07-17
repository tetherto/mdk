'use strict'

const test = require('brittle')
const { testModuleStructure, testHandlerFunctions, testPreHandlerFunctions } = require('../helpers/routeTestHelpers')
const { createRoutesForTest } = require('../helpers/mockHelpers')

test('actions routes - module structure', (t) => {
  testModuleStructure(t, '../../../workers/lib/server/routes/actions.routes.js', 'actions')
  t.pass()
})

test('actions routes - route definitions', (t) => {
  const routes = createRoutesForTest('../../../workers/lib/server/routes/actions.routes.js')

  const routeUrls = routes.map(route => route.url)
  t.ok(routeUrls.includes('/auth/actions'), 'should have actions GET route')
  t.ok(routeUrls.includes('/auth/actions/batch'), 'should have actions batch GET route')
  t.ok(routeUrls.includes('/auth/actions/:type/:id'), 'should have actions single GET route')
  t.ok(routeUrls.includes('/auth/actions/voting'), 'should have actions voting POST route')
  t.ok(routeUrls.includes('/auth/actions/voting/batch'), 'should have actions voting batch POST route')
  t.ok(routeUrls.includes('/auth/actions/voting/:id/vote'), 'should have actions vote PUT route')
  t.ok(routeUrls.includes('/auth/actions/voting/cancel'), 'should have actions cancel DELETE route')

  t.pass()
})

test('actions routes - HTTP methods', (t) => {
  const routes = createRoutesForTest('../../../workers/lib/server/routes/actions.routes.js')

  const actionsRoute = routes.find(r => r.url === '/auth/actions')
  t.is(actionsRoute.method, 'GET', 'actions route should be GET')

  const votingRoute = routes.find(r => r.url === '/auth/actions/voting')
  t.is(votingRoute.method, 'POST', 'voting route should be POST')

  const voteRoute = routes.find(r => r.url === '/auth/actions/voting/:id/vote')
  t.is(voteRoute.method, 'PUT', 'vote route should be PUT')

  const cancelRoute = routes.find(r => r.url === '/auth/actions/voting/cancel')
  t.is(cancelRoute.method, 'DELETE', 'cancel route should be DELETE')

  t.pass()
})

test('actions routes - schema validation', (t) => {
  const routes = createRoutesForTest('../../../workers/lib/server/routes/actions.routes.js')

  const actionsRoute = routes.find(r => r.url === '/auth/actions')
  t.ok(actionsRoute.schema, 'actions route should have schema')
  t.ok(actionsRoute.schema.querystring, 'actions route should have querystring schema')
  t.ok(actionsRoute.schema.querystring.required.includes('queries'), 'queries should be required')

  const batchRoute = routes.find(r => r.url === '/auth/actions/batch')
  t.ok(batchRoute.schema, 'batch route should have schema')
  t.ok(batchRoute.schema.querystring.required.includes('ids'), 'ids should be required')

  const votingRoute = routes.find(r => r.url === '/auth/actions/voting')
  t.ok(votingRoute.schema, 'voting route should have schema')
  t.ok(votingRoute.schema.body, 'voting route should have body schema')
  t.ok(votingRoute.schema.body.required.includes('query'), 'query should be required in voting route')

  t.pass()
})

test('actions routes - schema constraints for security', (t) => {
  const routes = createRoutesForTest('../../../workers/lib/server/routes/actions.routes.js')

  const actionsRoute = routes.find(r => r.url === '/auth/actions')
  const queriesProp = actionsRoute.schema.querystring.properties.queries
  t.is(queriesProp.maxLength, 1000, 'queries should have maxLength 1000')

  const suffixProp = actionsRoute.schema.querystring.properties.suffix
  t.is(suffixProp.maxLength, 200, 'GET suffix should have maxLength 200')

  const batchRoute = routes.find(r => r.url === '/auth/actions/voting/batch')
  const batchSuffix = batchRoute.schema.body.properties.suffix
  t.is(batchSuffix.maxLength, 200, 'POST suffix should have maxLength 200')

  t.pass()
})

test('actions routes - handler functions', (t) => {
  const routes = createRoutesForTest('../../../workers/lib/server/routes/actions.routes.js')
  testHandlerFunctions(t, routes, 'actions')
  t.pass()
})

test('actions routes - preHandler functions', (t) => {
  const routes = createRoutesForTest('../../../workers/lib/server/routes/actions.routes.js')
  testPreHandlerFunctions(t, routes, 'actions')
  t.pass()
})
