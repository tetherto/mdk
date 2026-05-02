'use strict'

const {
  ENDPOINTS,
  HTTP_METHODS,
  AUTH_PERMISSIONS
} = require('../../constants')
const { getConfigs } = require('../handlers/configs.handlers')
const { createCachedAuthRoute } = require('../lib/routeHelpers')

module.exports = (ctx) => {
  return [
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.CONFIGS,
      schema: {
        params: {
          type: 'object',
          properties: {
            type: { type: 'string' }
          },
          required: ['type']
        },
        querystring: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            fields: { type: 'string' },
            overwriteCache: { type: 'boolean' }
          }
        }
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => ['configs', req.params.type, req.query.query, req.query.fields],
        ENDPOINTS.CONFIGS,
        getConfigs,
        [`${AUTH_PERMISSIONS.POOL_CONFIG}:r`]
      )
    }
  ]
}
