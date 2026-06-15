'use strict'

const test = require('brittle')

test('ws routes - module structure', (t) => {
  const routesModule = require('../../../workers/lib/server/routes/ws.routes.js')
  t.ok(typeof routesModule === 'function', 'routes module should export a function')

  const mockCtx = {
    wsClients: new Set()
  }
  const routes = routesModule(mockCtx)
  t.ok(Array.isArray(routes), 'routes function should return an array')
  t.ok(routes.length > 0, 'routes array should not be empty')

  t.pass()
})

test('ws routes - route definitions', (t) => {
  const mockCtx = {
    wsClients: new Set()
  }
  const routes = require('../../../workers/lib/server/routes/ws.routes.js')(mockCtx)

  const routeUrls = routes.map(route => route.url)
  t.ok(routeUrls.some(url => url.includes('websocket') || url.includes('ws')), 'should have websocket route')

  t.pass()
})

test('ws routes - websocket flag', (t) => {
  const mockCtx = {
    wsClients: new Set()
  }
  const routes = require('../../../workers/lib/server/routes/ws.routes.js')(mockCtx)

  const wsRoute = routes.find(r => r.websocket === true)
  t.ok(wsRoute, 'should have websocket route with websocket flag')
  t.is(wsRoute.websocket, true, 'websocket route should have websocket flag set to true')

  t.pass()
})

test('ws routes - HTTP method', (t) => {
  const mockCtx = {
    wsClients: new Set()
  }
  const routes = require('../../../workers/lib/server/routes/ws.routes.js')(mockCtx)

  const wsRoute = routes.find(r => r.websocket === true)
  if (wsRoute) {
    t.is(wsRoute.method, 'GET', 'websocket route should be GET')
  }

  t.pass()
})

test('ws routes - onRequest function', (t) => {
  const mockCtx = {
    wsClients: new Set()
  }
  const routes = require('../../../workers/lib/server/routes/ws.routes.js')(mockCtx)

  const wsRoute = routes.find(r => r.websocket === true)
  if (wsRoute) {
    t.ok(typeof wsRoute.onRequest === 'function', 'websocket route should have onRequest function')
  }

  t.pass()
})

test('ws routes - handler function', (t) => {
  const mockCtx = {
    wsClients: new Set()
  }
  const routes = require('../../../workers/lib/server/routes/ws.routes.js')(mockCtx)

  const wsRoute = routes.find(r => r.websocket === true)
  if (wsRoute) {
    t.ok(typeof wsRoute.handler === 'function', 'websocket route should have handler function')
  }

  t.pass()
})

test('ws routes - handler adds client to wsClients', async (t) => {
  const mockCtx = {
    wsClients: new Set(),
    alertsService: {
      fetchAlerts: async () => []
    }
  }
  const routes = require('../../../workers/lib/server/routes/ws.routes.js')(mockCtx)

  const wsRoute = routes.find(r => r.websocket === true)
  if (wsRoute?.handler) {
    const mockSocket = {
      subscriptions: new Set(),
      on: function (event, handler) {
        if (event === 'close' || event === 'error') {
          this._closeHandler = handler
          this._errorHandler = handler
        } else if (event === 'message') {
          this._messageHandler = handler
        }
      },
      send: function () {}
    }

    await wsRoute.handler(mockSocket)
    t.ok(mockCtx.wsClients.has(mockSocket), 'should add socket to wsClients')
  }

  t.pass()
})
