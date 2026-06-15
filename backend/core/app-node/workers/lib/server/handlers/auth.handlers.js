'use strict'

const gLibUtilBase = require('@bitfinex/lib-js-util-base')
const { parseJsonQueryParam, getAuthTokenFromHeaders } = require('../../utils')

async function getUserInfo (ctx, req) {
  return req._info.user
}

async function newAuthToken (ctx, req) {
  const opts = gLibUtilBase.pick(req.body, ['ips', 'ttl', 'pfx', 'scope', 'roles'])
  opts.oldToken = getAuthTokenFromHeaders(req.headers)
  if (!opts.ttl && ctx.conf.ttl) opts.ttl = ctx.conf.ttl
  return ctx.authLib.regenerateToken(opts)
}

async function getUserPermissions (ctx, req) {
  return ctx.authLib.getTokenPerms(req._info.authToken)
}

function getSiteName (ctx) {
  return { site: ctx.conf.site }
}

async function extDataRoute (ctx, req, rep) {
  if (req.query.query) {
    req.query.query = parseJsonQueryParam(req.query.query, 'ERR_QUERY_INVALID_JSON')
  }

  return await ctx.dataProxy.requestDataMap('getWrkExtData', req.query)
}

module.exports = {
  getUserInfo,
  newAuthToken,
  getUserPermissions,
  getSiteName,
  extDataRoute
}
