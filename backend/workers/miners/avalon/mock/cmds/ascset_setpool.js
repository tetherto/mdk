'use strict'

const { parseCmdArguments, proxyState } = require('../utils')

module.exports = proxyState(function (ctx, state, cmd) {
  const secondsFromStart = Math.floor((Date.now() - state.startTime) / 1000)
  const args = parseCmdArguments(cmd)
  if (args.length === 6 && args[2] >= '0' && args[2] <= '2' && args[0] === 'root' && args[1] === 'root') {
    const idx = parseInt(args[2])
    state.pools[idx].url = args[3]
    state.pools[idx].username = args[4]
  } else {
    return `STATUS=E,When=${secondsFromStart},Code=120,Msg=ASC 0 set failed: Auth Failed! password invalid!,Description=cgminer 4.11.1| `
  }
})
