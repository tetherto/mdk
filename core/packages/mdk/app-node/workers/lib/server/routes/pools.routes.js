'use strict'

const {
  ENDPOINTS,
  HTTP_METHODS
} = require('../../constants')
const {
  getPools,
  getPoolBalanceHistory,
  getPoolThingConfig,
  getPoolStatsContainers
} = require('../handlers/pools.handlers')
const { createCachedAuthRoute, createAuthRoute } = require('../lib/routeHelpers')

module.exports = (ctx) => {
  const schemas = require('../schemas/pools.schemas.js')

  return [
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.POOLS,
      schema: {
        querystring: schemas.query.pools
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'pools',
          req.query.query,
          req.query.sort,
          req.query.fields
        ],
        ENDPOINTS.POOLS,
        getPools
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.POOLS_BALANCE_HISTORY,
      schema: {
        querystring: schemas.query.balanceHistory
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'pools/balance-history',
          req.params.pool,
          req.query.start,
          req.query.end,
          req.query.range
        ],
        ENDPOINTS.POOLS_BALANCE_HISTORY,
        getPoolBalanceHistory
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.POOLS_THING_CONFIG,
      ...createAuthRoute(
        ctx,
        getPoolThingConfig
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.POOLS_CONTAINERS_STATS,
      ...createAuthRoute(
        ctx,
        getPoolStatsContainers
      )
    }
  ]
}
