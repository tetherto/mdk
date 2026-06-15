'use strict'

const { createSuccessResponse } = require('../utils')

module.exports = function (ctx) {
  // no way to access info from miner
  return createSuccessResponse()
}
