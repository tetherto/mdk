'use strict'

async function getUserPermissions (ctx, req) {
  return ctx.authLib.getTokenPerms(req._info.authToken)
}

module.exports = async function (req, services) {
  return getUserPermissions(services, req)
}

module.exports.getUserPermissions = getUserPermissions
