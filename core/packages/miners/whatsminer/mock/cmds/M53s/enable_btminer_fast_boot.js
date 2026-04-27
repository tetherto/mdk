'use strict'

const { proxyState, createSuccessResponse } = require('../../utils')

module.exports = proxyState(function (ctx, state) {
  state.summary['Btminer Fast Boot'] = 'enable'
  return createSuccessResponse()
})
