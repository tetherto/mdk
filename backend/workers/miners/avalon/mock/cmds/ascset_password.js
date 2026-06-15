'use strict'

const { parseCmdArguments, proxyState } = require('../utils')

module.exports = proxyState(function (ctx, state, cmd) {
  const secondsFromStart = Math.floor((Date.now() - state.startTime) / 1000)
  const args = parseCmdArguments(cmd)
  if (args.length === 1 && args[0] === 'default') {
    return `STATUS=S,When=${secondsFromStart},Code=119,Msg=ASC 0 set OK,Description=cgminer 4.11.1| `
  } else if (args.length === 2 || args[0] === 'root') {
    return `STATUS=I,When=${secondsFromStart},Code=118,Msg=ASC 0 set info: new password success set to ${args[1]}.\n,Description=cgminer 4.11.1| `
  } else {
    return `STATUS=E,When=${secondsFromStart},Code=120,Msg=ASC 0 set failed: Auth Failed! password invalid!,Description=cgminer 4.11.1| `
  }
})
