'use strict'

const test = require('brittle')
const { testModuleStructure, testHandlerFunctions, testOnRequestFunctions } = require('../helpers/routeTestHelpers')
const { createRoutesForTest } = require('../helpers/mockHelpers')

test('users routes - module structure', (t) => {
  testModuleStructure(t, '../../../workers/lib/server/routes/users.routes.js', 'users')
  t.pass()
})

test('users routes - route definitions', (t) => {
  const routes = createRoutesForTest('../../../workers/lib/server/routes/users.routes.js')

  const routeUrls = routes.map(route => route.url)
  t.ok(routeUrls.includes('/auth/users'), 'should have users route')
  t.ok(routeUrls.includes('/auth/users/delete'), 'should have users delete route')
  t.ok(routeUrls.includes('/auth/roles/permissions'), 'should have roles permissions route')

  t.pass()
})

test('users routes - HTTP methods', (t) => {
  const routes = createRoutesForTest('../../../workers/lib/server/routes/users.routes.js')

  const postRoute = routes.find(r => r.url === '/auth/users' && r.method === 'POST')
  t.ok(postRoute, 'should have POST route for creating users')

  const getRoute = routes.find(r => r.url === '/auth/users' && r.method === 'GET')
  t.ok(getRoute, 'should have GET route for listing users')

  const putRoute = routes.find(r => r.url === '/auth/users' && r.method === 'PUT')
  t.ok(putRoute, 'should have PUT route for updating users')

  const deleteRoute = routes.find(r => r.url === '/auth/users/delete' && r.method === 'POST')
  t.ok(deleteRoute, 'should have POST route for deleting users')

  const rolesPermsRoute = routes.find(r => r.url === '/auth/roles/permissions' && r.method === 'GET')
  t.ok(rolesPermsRoute, 'should have GET route for roles permissions')

  t.pass()
})

test('users routes - schema validation', (t) => {
  const routes = createRoutesForTest('../../../workers/lib/server/routes/users.routes.js')

  const postRoute = routes.find(r => r.url === '/auth/users' && r.method === 'POST')
  t.ok(postRoute.schema, 'POST route should have schema')
  t.ok(postRoute.schema.body, 'POST route should have body schema')
  t.ok(postRoute.schema.body.required.includes('data'), 'data should be required')
  t.ok(postRoute.schema.body.properties.data.required.includes('email'), 'email should be required')
  t.ok(postRoute.schema.body.properties.data.required.includes('role'), 'role should be required')

  const putRoute = routes.find(r => r.url === '/auth/users' && r.method === 'PUT')
  t.ok(putRoute.schema, 'PUT route should have schema')
  t.ok(putRoute.schema.body.properties.data.required.includes('id'), 'id should be required in PUT')

  t.pass()
})

test('users routes - onRequest functions', (t) => {
  const routes = createRoutesForTest('../../../workers/lib/server/routes/users.routes.js')
  testOnRequestFunctions(t, routes, 'users')
  t.pass()
})

test('users routes - handler functions', (t) => {
  const routes = createRoutesForTest('../../../workers/lib/server/routes/users.routes.js')
  testHandlerFunctions(t, routes, 'users')
  t.pass()
})
