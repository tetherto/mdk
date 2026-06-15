'use strict'

const { proxyState, createSuccessResponse } = require('../utils')

module.exports = proxyState(function (ctx, state, req) {
  if (state.pre_power_on) {
    state.pre_power_on = false
    return createSuccessResponse({ complete: 'true', msg: 'adjust complete' })
  } else {
    state.pre_power_on = true
    return createSuccessResponse({ complete: 'false', msg: 'wait for adjust temp' })
  }
})
