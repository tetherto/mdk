'use strict'

const { parseCmdArguments } = require('../utils')

module.exports = function (ctx, state, cmd) {
  const secondsFromStart = Math.floor((Date.now() - state.startTime) / 1000)
  const args = parseCmdArguments(cmd)
  if (args.length === 1 && args[0] === 'dhcp') {
    // no point storing as miner does not return this value
    return `STATUS=S,When=${secondsFromStart},Code=119,Msg=ASC 0 set OK,Description=cgminer 4.11.1| `
  } else if (args.length === 4 && args[0] === 'static') {
    // no point storing as miner does not return this value
    return `STATUS=I,When=${secondsFromStart},Code=118,Msg=ASC 0 set info: IP[S ${args[1]} ${args[2]} ${args[3]}],Description=cgminer 4.11.1| `
  } else {
    return `STATUS=E,When=${secondsFromStart},Code=120,Msg=ASC 0 set failed: ,Description=cgminer 4.11.1| `
  }
}
