'use strict'

const { extractIps, getAuthTokenFromHeaders } = require('../../utils')
const { AUTH_CACHE_TTL } = require('../../constants')

async function authCheck (ctx, req, rep, tokenFromQuery = null) {
  req._info = req._info || {}

  if (ctx.noAuth) return

  const token = tokenFromQuery || getAuthTokenFromHeaders(req.headers)
  if (!token) {
    return rep.status(401).send({
      statusCode: 401,
      error: 'Missing or invalid Authorization header',
      message: 'ERR_AUTH_FAIL'
    })
  }

  const ips = extractIps(req)

  const cacheKey = `${token}:${ips.join(',')}`

  const cached = ctx.lru_1m?.get(cacheKey)
  if (cached && (ctx.conf.ttl * 1000) > AUTH_CACHE_TTL) {
    req._info.user = cached
    req._info.authToken = token
    return
  }

  try {
    const user = await ctx.authLib?.resolveToken(token, ips)

    if (!user) {
      return rep.status(401).send({
        statusCode: 401,
        error: 'Authentication failed',
        message: 'ERR_AUTH_FAIL'
      })
    }

    ctx.lru_1m?.set(cacheKey, user)

    req._info.user = user
    req._info.authToken = token
  } catch (err) {
    console.error('[authCheck] ❌ Final error:', err)
    throw new Error('ERR_AUTH_FAIL')
  }
}

module.exports = { authCheck }
