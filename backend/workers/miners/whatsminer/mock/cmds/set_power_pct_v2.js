'use strict'

const { createSuccessResponse, createErrorResponse, validateArgs } = require('../utils')

const args = [[
  'percent'
]]

module.exports = function (ctx, state, req) {
  if (validateArgs(args, req)) {
    const percent = req.percent
    if (percent > 200 || percent <= 0) {
      return createErrorResponse(132, 'API command ERROR')
    }
    if (percent) {
      state.summary['Power Limit'] = state.summary['Power Limit'] * Number(percent) / 100
      state.summary['Target Freq'] = state.summary['Target Freq'] * Number(percent) / 100
    }
    return createSuccessResponse()
  } else {
    return createErrorResponse()
  }
}
