'use strict'

const { proxyState, createSuccessResponse, createErrorResponse, validateArgs } = require('../utils')

const args = [[
  'param'
], [
  'color',
  'period',
  'duration',
  'start'
]]

module.exports = proxyState(function (ctx, state, req) {
  if (validateArgs(args, req)) {
    if (req.param === 'auto') {
      state.miner_info.ledstat = 'auto'
    } else {
      state.miner_info.ledstat = 'manual'
    }
    return createSuccessResponse()
  } else {
    return createErrorResponse()
  }
})
