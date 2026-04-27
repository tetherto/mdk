'use strict'

const { proxyState } = require('../utils')

module.exports = proxyState(function (ctx, state) {
  state.summary['Power Mode'] = 'High'
  state.summary['Power Limit'] = 9600
  state.summary['Target Freq'] = 877
  state.summary['MHS av'] = 8345093
  return null
})
