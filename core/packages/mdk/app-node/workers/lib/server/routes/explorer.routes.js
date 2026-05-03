'use strict'

const {
  ENDPOINTS,
  HTTP_METHODS,
  AUTH_CAPS,
  AUTH_LEVELS
} = require('../../constants')
const { listExplorerRacks } = require('../handlers/explorer.handlers')
const { createCachedAuthRoute } = require('../lib/routeHelpers')

module.exports = (ctx) => [
  {
    method: HTTP_METHODS.GET,
    url: ENDPOINTS.EXPLORER_RACKS,
    schema: {
      querystring: {
        type: 'object',
        properties: {
          group: { type: 'string' },
          search: { type: 'string' },
          sort: { type: 'string' },
          offset: { type: 'integer' },
          limit: { type: 'integer' },
          overwriteCache: { type: 'boolean' }
        }
      }
    },
    ...createCachedAuthRoute(
      ctx,
      (req) => [
        'explorer-racks',
        req.query.group,
        req.query.search,
        req.query.sort,
        req.query.offset,
        req.query.limit
      ],
      ENDPOINTS.EXPLORER_RACKS,
      listExplorerRacks,
      [`${AUTH_CAPS.m}:${AUTH_LEVELS.READ}`]
    )
  }
]
