'use strict'

const { createSuccessResponse } = require('../utils')

module.exports = function (ctx, state) {
  return createSuccessResponse(state.version)
}
