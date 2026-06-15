'use strict'

const { createSuccessResponse, createErrorResponse, validateArgs } = require('../utils')

const args = [[
  'poweroff_cool'
]]

module.exports = function (ctx, state, req) {
  if (validateArgs(args, req)) {
    return createSuccessResponse()
  } else {
    return createErrorResponse()
  }
}
