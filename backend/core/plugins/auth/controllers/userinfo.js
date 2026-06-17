'use strict'

async function getUserInfo (ctx, req) {
  return req._info.user
}

module.exports = async function (req) {
  return getUserInfo(null, req)
}

module.exports.getUserInfo = getUserInfo
