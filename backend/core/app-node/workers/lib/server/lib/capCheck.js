'use strict'

async function capCheck (ctx, req, rep, perms, write = true) {
  const allowed = await ctx.authLib.tokenHasPerms(req._info.authToken, write, perms)
  if (allowed) return

  return rep.status(401).send({
    statusCode: 401,
    error: 'Authentication failed',
    message: 'ERR_AUTH_FAIL_NO_PERMS'
  })
}

module.exports = { capCheck }
