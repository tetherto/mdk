'use strict'

const { createSuccessResponse } = require('../utils')

module.exports = function (ctx, state) {
  return createSuccessResponse({ error_code: state.error_code })
}
