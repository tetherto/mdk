'use strict'

const md5 = require('../../lib/utils/md5')
const { createSuccessResponse } = require('../utils')

module.exports = function (ctx, state) {
  // max active tokens reached
  if (state.activeTokens >= 16) {
    state.activeTokens = 0
    return { Code: 136 }
  }

  state.activeTokens++

  const time = '0000'
  const salt = '5QAHiKMb'
  const newsalt = 'kowEj187'

  // Generate the token sign that the miner will generate
  // This matches the logic in miner.js _getToken()
  if (ctx.password && ctx.validTokens) {
    const key = md5.crypt(ctx.password, salt)
    const arr = key.split('$')
    const sign = md5.crypt(arr[arr.length - 1] + time, newsalt)
    const tmp = sign.split('$')
    const tokenSign = tmp[tmp.length - 1]
    ctx.validTokens.add(tokenSign)
  }

  return createSuccessResponse({ time, salt, newsalt })
}
