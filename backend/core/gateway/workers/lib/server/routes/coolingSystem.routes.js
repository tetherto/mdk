'use strict'

const { ENDPOINTS, HTTP_METHODS } = require('../../constants')
const { getCoolingSystemData } = require('../handlers/coolingSystem.handlers')
const { createCachedAuthRoute } = require('../lib/routeHelpers')

module.exports = (ctx) => [
  {
    method: HTTP_METHODS.GET,
    url: ENDPOINTS.COOLING_SYSTEM,
    schema: {
      querystring: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['miners', 'hvac'],
            description: 'Cooling system type: miners or hvac'
          },
          view: {
            type: 'string',
            enum: ['circuit1', 'circuit2', 'layout', 'ambient'],
            description: 'View to retrieve: circuit1, circuit2, layout, or ambient (hvac only)'
          },
          overwriteCache: {
            type: 'boolean',
            description: 'Force refresh cached data'
          }
        },
        required: ['type', 'view']
      }
    },
    ...createCachedAuthRoute(
      ctx,
      (req) => ['cooling-system', req.query.type, req.query.view],
      ENDPOINTS.COOLING_SYSTEM,
      getCoolingSystemData
    )
  }
]
