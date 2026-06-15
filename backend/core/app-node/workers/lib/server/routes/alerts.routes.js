'use strict'

const {
  ENDPOINTS,
  HTTP_METHODS,
  AUTH_PERMISSIONS
} = require('../../constants')
const {
  getSiteAlerts,
  getAlertsHistory
} = require('../handlers/alerts.handlers')
const { createCachedAuthRoute } = require('../lib/routeHelpers')

module.exports = (ctx) => {
  const schemas = require('../schemas/alerts.schemas.js')

  return [
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.ALERTS_SITE,
      schema: {
        querystring: schemas.query.siteAlerts
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'alerts/site',
          req.query.filter,
          req.query.sort,
          req.query.search,
          req.query.offset,
          req.query.limit
        ],
        ENDPOINTS.ALERTS_SITE,
        getSiteAlerts,
        [AUTH_PERMISSIONS.ALERTS]
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.ALERTS_HISTORY,
      schema: {
        querystring: schemas.query.alertsHistory
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'alerts/history',
          req.query.start,
          req.query.end,
          req.query.filter,
          req.query.search,
          req.query.sort,
          req.query.offset,
          req.query.limit
        ],
        ENDPOINTS.ALERTS_HISTORY,
        getAlertsHistory,
        [AUTH_PERMISSIONS.ALERTS]
      )
    }
  ]
}
