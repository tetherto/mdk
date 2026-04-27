'use strict'

const { parseCmdArguments, proxyState } = require('../utils')

module.exports = proxyState(function (ctx, state, cmd) {
  const secondsFromStart = Math.floor((Date.now() - state.startTime) / 1000)
  const args = parseCmdArguments(cmd)
  if (args.length === 2) {
    state.dns = [args[1], args[2]]
    return `STATUS=I,When=${secondsFromStart},Code=118,Msg=ASC 0 set info: DNS[${args[1]} ${args[2]}],Description=cgminer 4.11.1| `
  } else {
    return `STATUS=E,When=${secondsFromStart},Code=120,Msg=ASC 0 set failed: ,Description=cgminer 4.11.1| `
  }
})
