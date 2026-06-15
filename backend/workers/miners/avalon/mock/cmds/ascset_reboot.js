'use strict'

const { proxyState } = require('../utils')

module.exports = proxyState(function (ctx, state) {
  state.startTime = Date.now()
  state.suspended = false
  return null // need to kill connection
})
