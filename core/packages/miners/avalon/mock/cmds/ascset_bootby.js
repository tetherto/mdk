'use strict'

module.exports = function (ctx, state) {
  const secondsFromStart = Math.floor((Date.now() - state.startTime) / 1000)
  return `STATUS=I,When=${secondsFromStart},Code=118,Msg=ASC 0 set info: BOOTBY[0x05.0000],Description=cgminer 4.11.1| `
}
