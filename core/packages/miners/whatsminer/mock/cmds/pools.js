'use strict'

const { randomNumber } = require('../utils')

module.exports = function (ctx, state) {
  // miner returns incremental share values
  state.pools[0].Accepted += parseInt(randomNumber(0, 100))
  state.pools[0].Rejected += parseInt(randomNumber(0, 30))
  state.pools[0].Stale += parseInt(randomNumber(0, 10))

  return {
    STATUS: [{ STATUS: 'S', Msg: `${state.pools.length} Pool(s)` }],
    POOLS: state.pools,
    id: 1
  }
}
