'use strict'

const test = require('brittle')
const { testModuleStructure, testHandlerFunctions } = require('../helpers/routeTestHelpers')
const { createRoutesForTest } = require('../helpers/mockHelpers')

test('site routes - module structure', (t) => {
  testModuleStructure(t, '../../../workers/lib/server/routes/site.routes.js', '/site')
  t.pass()
})

test('site routes - route definitions', (t) => {
  const routes = createRoutesForTest('../../../workers/lib/server/routes/site.routes.js')

  const routeUrls = routes.map(route => route.url)
  t.ok(routeUrls.includes('/auth/site/status/live'), 'should have site status live route')
  t.ok(routeUrls.includes('/auth/site/overview/groups'), 'should have site overview groups route')
  t.ok(routeUrls.includes('/auth/site/efficiency'), 'should have site efficiency route')

  t.pass()
})

test('site routes - HTTP methods', (t) => {
  const routes = createRoutesForTest('../../../workers/lib/server/routes/site.routes.js')

  const siteStatusRoute = routes.find(r => r.url === '/auth/site/status/live')
  t.is(siteStatusRoute.method, 'GET', 'site status live route should be GET')

  const siteOverviewRoute = routes.find(r => r.url === '/auth/site/overview/groups')
  t.is(siteOverviewRoute.method, 'GET', 'site overview groups route should be GET')

  const siteEfficiencyRoute = routes.find(r => r.url === '/auth/site/efficiency')
  t.is(siteEfficiencyRoute.method, 'GET', 'site efficiency route should be GET')

  t.pass()
})

test('site routes - schema validation', (t) => {
  const routes = createRoutesForTest('../../../workers/lib/server/routes/site.routes.js')

  const siteStatusRoute = routes.find(r => r.url === '/auth/site/status/live')
  t.ok(siteStatusRoute.schema, 'site status live route should have schema')
  t.ok(siteStatusRoute.schema.querystring, 'should have querystring schema')
  t.is(siteStatusRoute.schema.querystring.properties.overwriteCache.type, 'boolean', 'overwriteCache should be boolean')

  const siteOverviewRoute = routes.find(r => r.url === '/auth/site/overview/groups')
  t.ok(siteOverviewRoute.schema, 'site overview groups route should have schema')
  t.ok(siteOverviewRoute.schema.querystring, 'should have querystring schema')
  t.is(siteOverviewRoute.schema.querystring.properties.overwriteCache.type, 'boolean', 'overwriteCache should be boolean')

  const siteEfficiencyRoute = routes.find(r => r.url === '/auth/site/efficiency')
  t.ok(siteEfficiencyRoute.schema, 'site efficiency route should have schema')
  t.ok(siteEfficiencyRoute.schema.querystring, 'should have querystring schema')
  t.is(siteEfficiencyRoute.schema.querystring.properties.overwriteCache.type, 'boolean', 'overwriteCache should be boolean')

  t.pass()
})

test('site routes - handler functions', (t) => {
  const routes = createRoutesForTest('../../../workers/lib/server/routes/site.routes.js')
  testHandlerFunctions(t, routes, '/site')
  t.pass()
})

test('site routes - onRequest functions', (t) => {
  const routes = createRoutesForTest('../../../workers/lib/server/routes/site.routes.js')

  routes.forEach(route => {
    t.ok(typeof route.onRequest === 'function', `/site route ${route.url} should have onRequest function`)
  })

  t.pass()
})
