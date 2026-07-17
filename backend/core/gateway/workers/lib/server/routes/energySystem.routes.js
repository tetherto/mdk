'use strict'

const { ENDPOINTS, HTTP_METHODS } = require('../../constants')
const { getEnergySystemData } = require('../handlers/energySystem.handlers')
const { createCachedAuthRoute } = require('../lib/routeHelpers')

module.exports = (ctx) => [
  {
    method: HTTP_METHODS.GET,
    url: ENDPOINTS.ENERGY_SYSTEM,
    schema: {
      querystring: {
        type: 'object',
        properties: {
          view: {
            type: 'string',
            enum: ['miners', 'cooling_auxiliary', 'layout'],
            description: 'View to retrieve: miners, cooling_auxiliary, or layout'
          },
          overwriteCache: {
            type: 'boolean',
            description: 'Force refresh cached data'
          }
        },
        required: ['view']
      }
    },
    ...createCachedAuthRoute(
      ctx,
      (req) => ['energy-system', req.query.view],
      ENDPOINTS.ENERGY_SYSTEM,
      getEnergySystemData
    )
  }
]
