'use strict'

const test = require('brittle')
const { testModuleStructure, testHandlerFunctions, testPreHandlerFunctions } = require('../helpers/routeTestHelpers')

test('things routes - module structure', (t) => {
  testModuleStructure(t, '../../../workers/lib/server/routes/things.routes.js', 'things')
  t.pass()
})

test('things routes - route definitions', (t) => {
  const mockCtx = {}
  const routes = require('../../../workers/lib/server/routes/things.routes.js')(mockCtx)

  const routeUrls = routes.map(route => route.url)
  t.ok(routeUrls.some(url => url.includes('list-things')), 'should have list-things route')
  t.ok(routeUrls.some(url => url.includes('list-racks')), 'should have list-racks route')
  t.ok(routeUrls.some(url => url.includes('thing/comment') || url.includes('thing-comment')), 'should have thing comment route')
  t.ok(routeUrls.some(url => url.includes('settings')), 'should have settings route')
  t.ok(routeUrls.some(url => url.includes('worker-config')), 'should have worker-config route')
  t.ok(routeUrls.some(url => url.includes('thing-config')), 'should have thing-config route')

  t.pass()
})

test('things routes - HTTP methods', (t) => {
  const mockCtx = {}
  const routes = require('../../../workers/lib/server/routes/things.routes.js')(mockCtx)

  const listThingsRoute = routes.find(r => r.url?.includes('list-things'))
  if (listThingsRoute) {
    t.is(listThingsRoute.method, 'GET', 'list-things route should be GET')
  }

  const commentRoute = routes.find(r => r.url && (r.url.includes('thing/comment') || r.url.includes('thing-comment')))
  if (commentRoute) {
    const postComment = routes.find(r => (r.url.includes('thing/comment') || r.url.includes('thing-comment')) && r.method === 'POST')
    const putComment = routes.find(r => (r.url.includes('thing/comment') || r.url.includes('thing-comment')) && r.method === 'PUT')
    const deleteComment = routes.find(r => (r.url.includes('thing/comment') || r.url.includes('thing-comment')) && r.method === 'DELETE')
    t.ok(postComment, 'should have POST route for comments')
    t.ok(putComment, 'should have PUT route for comments')
    t.ok(deleteComment, 'should have DELETE route for comments')
  }

  t.pass()
})

test('things routes - schema validation', (t) => {
  const mockCtx = {}
  const routes = require('../../../workers/lib/server/routes/things.routes.js')(mockCtx)

  const listRacksRoute = routes.find(r => r.url?.includes('list-racks'))
  if (listRacksRoute) {
    t.ok(listRacksRoute.schema, 'list-racks route should have schema')
    t.ok(listRacksRoute.schema.querystring, 'list-racks route should have querystring schema')
  }

  const settingsRoute = routes.find(r => r.url?.includes('settings'))
  if (settingsRoute) {
    const getSettings = routes.find(r => r.url?.includes('settings') && r.method === 'GET')
    if (getSettings) {
      t.ok(getSettings.schema, 'GET settings route should have schema')
      t.ok(getSettings.schema.querystring.required.includes('rackId'), 'rackId should be required')
    }
  }

  const workerConfigRoute = routes.find(r => r.url?.includes('worker-config'))
  if (workerConfigRoute) {
    t.ok(workerConfigRoute.schema, 'worker-config route should have schema')
    t.ok(workerConfigRoute.schema.querystring.required.includes('type'), 'type should be required')
  }

  t.pass()
})

test('things routes - handler functions', (t) => {
  const mockCtx = {}
  const routes = require('../../../workers/lib/server/routes/things.routes.js')(mockCtx)
  testHandlerFunctions(t, routes, 'things')
  t.pass()
})

test('things routes - preHandler functions', (t) => {
  const mockCtx = {}
  const routes = require('../../../workers/lib/server/routes/things.routes.js')(mockCtx)
  testPreHandlerFunctions(t, routes, 'things')
  t.pass()
})
