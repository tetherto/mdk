'use strict'

const { cloneDeep } = require('@bitfinex/lib-js-util-base')
const { generateRandomizedDataWorkers, getRandomFullHashRate, getRandomProfitInfo } = require('./utils')

module.exports = function (CTX) {
  const state = {
    profit_info: getRandomProfitInfo(),
    full_hashrate: getRandomFullHashRate(),
    workers_list: generateRandomizedDataWorkers('spider-test', CTX && CTX.workerCount),
    payment_records: {},
    hashrate_chart_cache: {}
  }

  const initialState = cloneDeep(state)

  function cleanup () {
    Object.assign(state, initialState)
    state.hashrate_chart_cache = {}

    return state
  }

  return { state, cleanup }
}
