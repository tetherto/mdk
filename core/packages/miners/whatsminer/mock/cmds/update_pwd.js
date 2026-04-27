'use strict'

const { createSuccessResponse, createErrorResponse, validateArgs } = require('../utils')

const args = [[
  'old',
  'new'
]]

module.exports = function (ctx, state, req) {
  if (validateArgs(args, req)) {
    return createSuccessResponse()
  } else {
    return createErrorResponse()
  }
}
