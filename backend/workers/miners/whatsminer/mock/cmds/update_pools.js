'use strict'

const { proxyState, createSuccessResponse, createErrorResponse, validateArgs } = require('../utils')

const args = [[
  'pool1',
  'pool2',
  'pool3',
  'worker1',
  'worker2',
  'worker3',
  'passwd1',
  'passwd2',
  'passwd3'
]]

module.exports = proxyState(function (ctx, state, req) {
  if (validateArgs(args, req)) {
    state.pools.forEach((pool, i) => {
      pool.URL = req[`pool${i + 1}`]
      pool.User = req[`worker${i + 1}`]
    })
    return createSuccessResponse()
  } else {
    return createErrorResponse(132, 'API parse pools param error')
  }
})
