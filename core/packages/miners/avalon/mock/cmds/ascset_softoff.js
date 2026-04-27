'use strict'

const { proxyState } = require('../utils')

module.exports = proxyState(function (ctx, state) {
  const secondsFromStart = Math.floor((Date.now() - state.startTime) / 1000)
  state.suspended = true
  return `STATUS=S,When=${secondsFromStart},Code=119,Msg=ASC 0 set OK,Description=cgminer 4.11.1| `
})
