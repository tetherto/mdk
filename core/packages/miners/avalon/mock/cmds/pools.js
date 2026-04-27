'use strict'

const { proxyState, randomNumber } = require('../utils')

module.exports = proxyState(function (ctx, state) {
  // miner returns incremental share values
  state.accepted += parseInt(randomNumber(0, 100))
  state.rejected += parseInt(randomNumber(0, 30))
  state.stale += parseInt(randomNumber(0, 10))

  const secondsFromStart = Math.floor((Date.now() - state.startTime) / 1000)
  const pools = state.pools.map((pool, index) => {
    return `|POOL=${index},URL=${pool.url},Status=Alive,Priority=${index},Quota=1,Long Poll=N,Getworks=0,Accepted=${state.accepted},Rejected=${state.rejected},Works=0,Discarded=0,Stale=${state.stale},Get Failures=0,Remote Failures=0,User=${pool.username},Last Share Time=0,Diff1 Shares=0,Proxy Type=,Proxy=,Difficulty Accepted=0.00000000,Difficulty Rejected=0.00000000,Difficulty Stale=0.00000000,Last Share Difficulty=0.00000000,Work Difficulty=0.00000000,Has Stratum=true,Stratum Active=false,Stratum URL=,Stratum Difficulty=0.00000000,Has Vmask=false,Has GBT=false,Best Share=0,Pool Rejected%=0.0000,Pool Stale%=0.0000,Bad Work=0,Current Block Height=0,Current Block Version=0|`
  })
  return `STATUS=S,When=${secondsFromStart},Code=7,Msg=3 Pool(s),Description=cgminer 4.11.1` + pools.join('')
})
