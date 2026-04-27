'use strict'

const { createSuccessResponse, createErrorResponse, validateArgs } = require('../utils')

const args = [[
  'upfreq_speed'
]]

module.exports = function (ctx, state, req) {
  if (validateArgs(args, req)) {
    if (req.upfreq_speed) {
      state.miner_info.upfreq_speed = req.upfreq_speed
    }
    return createSuccessResponse()
  } else {
    return createErrorResponse()
  }
}
