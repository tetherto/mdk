'use strict'

const { createSuccessResponse } = require('../utils')

module.exports = function (ctx, state) {
  // no way to access info from miner
  return createSuccessResponse()
}
