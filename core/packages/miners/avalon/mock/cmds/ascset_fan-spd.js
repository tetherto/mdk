'use strict'

const { parseCmdArguments, proxyState } = require('../utils')

module.exports = proxyState(function (ctx, state, cmd) {
  const args = parseCmdArguments(cmd)
  const secondsFromStart = Math.floor((Date.now() - state.startTime) / 1000)
  if (args.length === 1 && parseInt(args[0]) >= 0 && parseInt(args[0]) <= 100) {
    state.fanSpeed = parseInt(args[0])
    return `STATUS=S,When=${secondsFromStart},Code=119,Msg=ASC 0 set OK,Description=cgminer 4.11.1| `
  } else {
    return `STATUS=E,When=${secondsFromStart},Code=119,Msg=ASC 0 set failed: ,Description=cgminer 4.11.1| `
  }
})
