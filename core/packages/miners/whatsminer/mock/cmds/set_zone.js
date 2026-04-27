'use strict'

const { proxyState, createSuccessResponse, createErrorResponse, validateArgs } = require('../utils')

const args = [[
  'timezone',
  'zonename'
]]

module.exports = proxyState(function (ctx, state, req) {
  if (validateArgs(args, req)) {
    state.zone.timezone = req.timezone
    state.zone.zonename = req.zonename
    return createSuccessResponse()
  } else {
    return createErrorResponse()
  }
})
