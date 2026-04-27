'use strict'

const { proxyState } = require('../utils')

module.exports = proxyState(function (ctx, state) {
  // miner does not respond
  state.elapsed = +new Date()
  state.uptime = +new Date()
  return null
})
