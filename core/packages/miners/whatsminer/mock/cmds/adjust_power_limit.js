'use strict'

const { proxyState, createSuccessResponse, createErrorResponse, validateArgs } = require('../utils')

const args = [[
  'power_limit'
]]

module.exports = proxyState(function (ctx, state, req) {
  if (validateArgs(args, req)) {
    const powerLimit = parseInt(req.power_limit)
    if (powerLimit === 99999) state.summary['Power Limit'] = 0
    else state.summary['Power Limit'] = powerLimit
    return createSuccessResponse()
  } else {
    return createErrorResponse()
  }
})
