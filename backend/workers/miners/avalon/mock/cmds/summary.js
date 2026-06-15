'use strict'

module.exports = function (ctx, state) {
  const secondsFromStart = Math.floor((Date.now() - state.startTime) / 1000)
  return `STATUS=S,When=${secondsFromStart},Code=11,Msg=Summary,Description=cgminer 4.11.1|SUMMARY,Elapsed=${secondsFromStart},MHS av=${state.mhsAv},MHS 30s=${state.mhsAv},MHS 1m=${state.mhsAv},MHS 5m=${state.mhsAv},MHS 15m=${state.mhsAv},Found Blocks=0,Getworks=0,Accepted=${state.accepted},Rejected=0,Hardware Errors=0,Utility=0.00,Discarded=0,Stale=0,Get Failures=0,Local Work=0,Remote Failures=0,Network Blocks=0,Total MH=${state.mhsAv * 4},Work Utility=0.00,Difficulty Accepted=1048576.00000,Difficulty Rejected=0.00000000,Difficulty Stale=0.00000000,Best Share=0,Device Hardware%=0.0000,Device Rejected%=0.0000,Pool Rejected%=0.0000,Pool Stale%=0.0000,Last getwork=0| `
}
