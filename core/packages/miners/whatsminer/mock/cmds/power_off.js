'use strict'

const { proxyState } = require('../utils')

module.exports = proxyState(function (ctx, state) {
  state.suspended = true
  state.summary['MHS av'] = 0
  return null
})
