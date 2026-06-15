'use strict'

module.exports = function (ctx, state) {
  const secondsFromStart = Math.floor((Date.now() - state.startTime) / 1000)
  return `STATUS=S,When=${secondsFromStart},Code=22,Msg=CGMiner versions,Description=cgminer 4.11.1|VERSION,CGMiner=4.11.1,API=3.7,STM8=20.08.01,PROD=AvalonMiner 1346-116,MODEL=1346-116,HWTYPE=MM4v1_X3,SWTYPE=MM317,VERSION=23042501_6d4cd98_d3a493a,LOADER=d0d779de.00,DNA=${ctx.serial},MAC=b4a2eb3f2348,UPAPI=2| `
}
