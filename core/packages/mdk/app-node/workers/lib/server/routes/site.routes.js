'use strict'

const {
  ENDPOINTS,
  HTTP_METHODS,
  AUTH_CAPS,
  AUTH_LEVELS
} = require('../../constants')
const { getSiteLiveStatus, getSiteOverviewGroupsStats, getSiteEfficiency } = require('../handlers/site.handlers')
const { createCachedAuthRoute } = require('../lib/routeHelpers')

module.exports = (ctx) => [
  {
    method: HTTP_METHODS.GET,
    url: ENDPOINTS.SITE_STATUS_LIVE,
    schema: {
      querystring: {
        type: 'object',
        properties: {
          overwriteCache: { type: 'boolean' }
        }
      }
    },
    ...createCachedAuthRoute(
      ctx,
      ['site-status-live'],
      ENDPOINTS.SITE_STATUS_LIVE,
      getSiteLiveStatus
    )
  },
  {
    method: HTTP_METHODS.GET,
    url: ENDPOINTS.SITE_OVERVIEW_GROUPS,
    schema: {
      querystring: {
        type: 'object',
        properties: {
          overwriteCache: { type: 'boolean' }
        }
      }
    },
    ...createCachedAuthRoute(
      ctx,
      ['site-overview/groups'],
      ENDPOINTS.SITE_OVERVIEW_GROUPS,
      getSiteOverviewGroupsStats,
      [`${AUTH_CAPS.m}:${AUTH_LEVELS.READ}`]
    )
  },
  {
    method: HTTP_METHODS.GET,
    url: ENDPOINTS.SITE_EFFICIENCY,
    schema: {
      querystring: {
        type: 'object',
        properties: {
          overwriteCache: { type: 'boolean' }
        }
      }
    },
    ...createCachedAuthRoute(
      ctx,
      ['site-efficiency'],
      ENDPOINTS.SITE_EFFICIENCY,
      getSiteEfficiency,
      [`${AUTH_CAPS.m}:${AUTH_LEVELS.READ}`]
    )
  }
]
