'use strict'

const { proxyState, createSuccessResponse, createErrorResponse, validateArgs } = require('../utils')

const args = [[
  'hostname'
]]

module.exports = proxyState(function (ctx, state, req) {
  if (validateArgs(args, req)) {
    state.miner_info.hostname = req.hostname
    return createSuccessResponse()
  } else {
    return createErrorResponse()
  }
})
