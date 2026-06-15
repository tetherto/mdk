'use strict'

const { parseCmdArguments, proxyState } = require('../utils')

module.exports = proxyState(function (ctx, state, cmd) {
  const args = parseCmdArguments(cmd)
  const secondsFromStart = Math.floor((Date.now() - state.startTime) / 1000)
  // if args[0] === '255'
  if (args.length === 1 && args[0] === '255') {
    return `STATUS=I,When=${secondsFromStart},Code=118,Msg=ASC 0 set info: WORKMODE[${state.workMode}] success,Description=cgminer 4.11.1| `
  } else if (args.length === 1 && args[0] >= '0' && args[0] <= '2') {
    state.workMode = args[0]
    return `STATUS=I,When=${secondsFromStart},Code=118,Msg=ASC 0 set info: WORKMODE[${args[0]}] success,Description=cgminer 4.11.1| `
  } else {
    return `STATUS=E,When=${secondsFromStart},Code=119,Msg=ASC 0 set failed: ,Description=cgminer 4.11.1| `
  }
})
