'use strict'

const testModuleStructure = (t, routesModulePath, moduleName) => {
  const routesModule = require(routesModulePath)
  t.ok(typeof routesModule === 'function', `${moduleName} routes module should export a function`)

  const mockCtx = {}
  const routes = routesModule(mockCtx)
  t.ok(Array.isArray(routes), `${moduleName} routes function should return an array`)
  t.ok(routes.length > 0, `${moduleName} routes array should not be empty`)

  return routes
}

const testHandlerFunctions = (t, routes, moduleName) => {
  routes.forEach(route => {
    t.ok(typeof route.handler === 'function', `${moduleName} route ${route.url} should have handler function`)
  })
}

const testPreHandlerFunctions = (t, routes, moduleName) => {
  const routesWithPreHandler = routes.filter(route => route.preHandler)
  routesWithPreHandler.forEach(route => {
    t.ok(typeof route.preHandler === 'function', `${moduleName} route ${route.url} preHandler should be function`)
  })
}

const testOnRequestFunctions = (t, routes, moduleName) => {
  const routesWithOnRequest = routes.filter(route => route.onRequest)
  routesWithOnRequest.forEach(route => {
    t.ok(typeof route.onRequest === 'function', `${moduleName} route ${route.url} onRequest should be function`)
  })
}

const testPreValidationFunctions = (t, routes, moduleName) => {
  const routesWithPreValidation = routes.filter(route => route.preValidation)
  routesWithPreValidation.forEach(route => {
    t.ok(typeof route.preValidation === 'function', `${moduleName} route ${route.url} preValidation should be function`)
  })
}

module.exports = {
  testModuleStructure,
  testHandlerFunctions,
  testPreHandlerFunctions,
  testOnRequestFunctions,
  testPreValidationFunctions
}
