'use strict'

const test = require('brittle')
const { testModuleStructure, testHandlerFunctions, testPreHandlerFunctions, testPreValidationFunctions } = require('../helpers/routeTestHelpers')

test('logs routes - module structure', (t) => {
  testModuleStructure(t, '../../../workers/lib/server/routes/logs.routes.js', 'logs')
  t.pass()
})

test('logs routes - route definitions', (t) => {
  const mockCtx = {}
  const routes = require('../../../workers/lib/server/routes/logs.routes.js')(mockCtx)

  const routeUrls = routes.map(route => route.url)
  t.ok(routeUrls.some(url => url.includes('tail-log') && !url.includes('multi') && !url.includes('range')), 'should have tail-log route')
  t.ok(routeUrls.some(url => url.includes('tail-log') && url.includes('multi')), 'should have tail-log multi route')
  t.ok(routeUrls.some(url => url.includes('tail-log') && url.includes('range')), 'should have tail-log range-aggr route')
  t.ok(routeUrls.some(url => url.includes('history-log')), 'should have history-log route')

  t.pass()
})

test('logs routes - HTTP methods', (t) => {
  const mockCtx = {}
  const routes = require('../../../workers/lib/server/routes/logs.routes.js')(mockCtx)

  routes.forEach(route => {
    t.is(route.method, 'GET', `route ${route.url} should be GET`)
  })

  t.pass()
})

test('logs routes - schema validation', (t) => {
  const mockCtx = {}
  const routes = require('../../../workers/lib/server/routes/logs.routes.js')(mockCtx)

  const tailLogRoute = routes.find(r => r.url?.includes('tail-log') && !r.url.includes('multi') && !r.url.includes('range'))
  if (tailLogRoute) {
    t.ok(tailLogRoute.schema, 'tail-log route should have schema')
    t.ok(tailLogRoute.schema.querystring, 'tail-log route should have querystring schema')
    t.ok(tailLogRoute.schema.querystring.required.includes('key'), 'key should be required')
  }

  const tailLogMultiRoute = routes.find(r => r.url?.includes('tail-log') && r.url.includes('multi'))
  if (tailLogMultiRoute) {
    t.ok(tailLogMultiRoute.schema, 'tail-log multi route should have schema')
    t.ok(tailLogMultiRoute.schema.querystring.required.includes('keys'), 'keys should be required')
  }

  const historyLogRoute = routes.find(r => r.url?.includes('history-log'))
  if (historyLogRoute) {
    t.ok(historyLogRoute.schema, 'history-log route should have schema')
    t.ok(historyLogRoute.schema.querystring.required.includes('logType'), 'logType should be required')
  }

  t.pass()
})

test('logs routes - preValidation functions', (t) => {
  const mockCtx = {}
  const routes = require('../../../workers/lib/server/routes/logs.routes.js')(mockCtx)
  testPreValidationFunctions(t, routes, 'logs')
  t.pass()
})

test('logs routes - handler functions', (t) => {
  const mockCtx = {}
  const routes = require('../../../workers/lib/server/routes/logs.routes.js')(mockCtx)
  testHandlerFunctions(t, routes, 'logs')
  t.pass()
})

test('logs routes - preHandler functions', (t) => {
  const mockCtx = {}
  const routes = require('../../../workers/lib/server/routes/logs.routes.js')(mockCtx)
  testPreHandlerFunctions(t, routes, 'logs')
  t.pass()
})
