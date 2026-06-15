'use strict'

const { parseCmdArguments, proxyState } = require('../utils')

module.exports = proxyState(function (ctx, state, cmd) {
  const args = parseCmdArguments(cmd)
  const secondsFromStart = Math.floor((Date.now() - state.startTime) / 1000)
  if (args.length === 1 && args[0] === '1-255') {
    return `STATUS=I,When=${secondsFromStart},Code=118,Msg=ASC 0 set info: LED[${state.led ? '1' : '0'}],Description=cgminer 4.11.1| `
  } else if (args.length === 1 && (args[0] === '0-0' || args[0] === '0-1')) {
    state.led = args[0] === '0-1'
    return `STATUS=I,When=${secondsFromStart},Code=118,Msg=ASC 0 set info: LED[${args[0] === '0-1'}],Description=cgminer 4.11.1| `
  } else {
    return `STATUS=E,When=${secondsFromStart},Code=119,Msg=ASC 0 set failed: ,Description=cgminer 4.11.1| `
  }
})
