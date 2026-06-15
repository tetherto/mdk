'use strict'

const { proxyState, createSuccessResponse } = require('../utils')

module.exports = proxyState(function (ctx, state) {
  state.suspended = false
  state.elapsed = +new Date()
  return createSuccessResponse()
})
