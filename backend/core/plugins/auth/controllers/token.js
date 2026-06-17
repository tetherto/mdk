'use strict'

const gLibUtilBase = require('@bitfinex/lib-js-util-base')
const { getAuthTokenFromHeaders } = require('../../lib/utils')

async function newAuthToken (ctx, req) {
  const opts = gLibUtilBase.pick(req.body, ['ips', 'ttl', 'pfx', 'scope', 'roles'])
  opts.oldToken = getAuthTokenFromHeaders(req.headers)
  if (!opts.ttl && ctx.conf.ttl) opts.ttl = ctx.conf.ttl
  return ctx.authLib.regenerateToken(opts)
}

module.exports = async function (req, services) {
  const token = await newAuthToken(services, req)
  return { token }
}

module.exports.newAuthToken = newAuthToken
