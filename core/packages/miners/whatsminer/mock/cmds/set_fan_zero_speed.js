'use strict'

const { createSuccessResponse, createErrorResponse, validateArgs } = require('../utils')

const args = [[
  'fan_zero_speed'
]]

module.exports = function (ctx, state, req) {
  if (validateArgs(args, req)) {
    return createSuccessResponse()
  } else {
    return createErrorResponse()
  }
}
