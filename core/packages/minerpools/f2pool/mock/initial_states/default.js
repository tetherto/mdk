'use strict'

const { cloneDeep } = require('@bitfinex/lib-js-util-base')
const { generateRandomizedDataWorkers, getRandomHashrateInfo, getRandomBalanceInfo } = require('./utils')

module.exports = function () {
  const state = {
    balance_info: getRandomBalanceInfo(),
    hashrate_info: {
      info: {
        ...getRandomHashrateInfo(),
        name: 'haven7346'
      },
      history: null,
      currency: ''
    },
    workers_list: generateRandomizedDataWorkers(),
    transactions_list: {},
    hashrate_history_cache: {}
  }

  const initialState = cloneDeep(state)

  function cleanup () {
    Object.assign(state, initialState)
    state.hashrate_history_cache = {}

    return state
  }

  return { state, cleanup }
}
