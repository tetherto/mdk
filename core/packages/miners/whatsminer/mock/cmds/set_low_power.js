'use strict'

const { proxyState } = require('../utils')

module.exports = proxyState(function (ctx, state) {
  state.summary['Power Mode'] = 'Low'
  state.summary['Power Limit'] = 7700
  state.summary['Target Freq'] = 627
  state.summary['MHS av'] = 8345093
  return null
})
