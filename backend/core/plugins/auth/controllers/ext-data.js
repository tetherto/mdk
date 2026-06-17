'use strict'

const { parseJsonQueryParam } = require('../../lib/utils')

async function extDataRoute (ctx, req) {
  if (req.query.query) {
    req.query.query = parseJsonQueryParam(req.query.query, 'ERR_QUERY_INVALID_JSON')
  }
  return ctx.dataProxy.requestDataMap('getWrkExtData', req.query)
}

module.exports = async function (req, services) {
  return extDataRoute(services, req)
}

module.exports.extDataRoute = extDataRoute
