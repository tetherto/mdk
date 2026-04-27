'use strict'

const { eachDayOfInterval, set, eachHourOfInterval } = require('date-fns')
const { convertMsToSeconds } = require('../../lib/utils')
const crypto = require('crypto')

function randomFloat () {
  return crypto.randomBytes(6).readUIntBE(0, 6) / 2 ** 48
}

function randomNumber (min = 0, max = 1) {
  const number = randomFloat() * (max - min) + min
  return parseFloat(number.toFixed(2))
}

function getRandomInt (min, max) {
  return Math.floor(randomNumber() * (max - min + 1)) + min
}

function getRandomDecimal (min, max) {
  return randomNumber(min, max) * (max - min) + min
}

function getRandomIntTimestamp (minDate, maxDate) {
  const minTime = minDate.getTime()
  const maxTime = maxDate.getTime()
  const randomTime =
    Math.floor(randomNumber() * (maxTime - minTime + 1)) + minTime
  return randomTime
}

function getRandomIP () {
  return (
    getRandomInt(0, 255) +
    '.' +
    getRandomInt(0, 255) +
    '.' +
    getRandomInt(0, 255) +
    '.' +
    getRandomInt(0, 255)
  )
}

function getRandomHashrateinHs () {
  return getRandomInt(100000000000000, 999999999999999)
}

function getRandomHashrateInfo () {
  return {
    name: 'worker' + getRandomInt(1000, 9999),
    hash_rate: getRandomHashrateinHs(),
    h1_hash_rate: getRandomHashrateinHs(),
    h24_hash_rate: getRandomHashrateinHs(),
    h1_stale_hash_rate: getRandomHashrateinHs(),
    h24_stale_hash_rate: getRandomHashrateinHs(),
    h24_delay_hash_rate: getRandomHashrateinHs(),
    local_hash_rate: getRandomHashrateinHs(),
    h24_local_hash_rate: getRandomHashrateinHs()
  }
}

function getRandomHashrateHistoryItem (timestamp) {
  return {
    timestamp: convertMsToSeconds(timestamp),
    hash_rate: getRandomHashrateinHs(),
    stale_hash_rate: getRandomHashrateinHs(),
    delay_hash_rate: getRandomHashrateinHs()
  }
}

function getRandomWorkerData () {
  return {
    hash_rate_info: getRandomHashrateInfo(),
    last_share_at: getRandomInt(0, 100),
    status: getRandomInt(0, 1),
    host: getRandomIP()
  }
}

function getRandomTransactionData (minDate, maxDate) {
  return {
    id: getRandomInt(100000000, 999999999),
    type: 'revenue_fpps',
    changed_balance: getRandomDecimal(0.0001, 0.0009),
    created_at: convertMsToSeconds(minDate.getTime()),
    mining_extra: {
      mining_date: convertMsToSeconds(getRandomIntTimestamp(minDate, maxDate)),
      settle_date: convertMsToSeconds(getRandomIntTimestamp(minDate, maxDate)),
      pps: getRandomDecimal(0.0001, 0.0009),
      pps_fee_rate: getRandomDecimal(0.001, 0.009),
      tx_fee: getRandomDecimal(0.000001, 0.000009),
      tx_fee_rate: getRandomDecimal(0.001, 0.009),
      hash_rate: getRandomHashrateinHs()
    },
    payout_extra: null
  }
}

function getWorkerDataWithSameInfo () {
  const baseData = {
    hash_rate_info: {
      ...getRandomHashrateInfo(),
      name: 'haven7346'
    },
    last_share_at: 0,
    status: 0,
    host: '127.0.0.1'
  }

  return baseData
}

function addNewWorker (workers, newWorker) {
  if (!newWorker.name) {
    throw new Error('ERR_INVALID_NAME')
  }

  const workerName = newWorker.name.split('.')[1]

  if (workers.findIndex(wrk => wrk.hash_rate_info.name === workerName) > -1) {
    throw new Error('ERR_WORKER_EXISTS')
  }

  workers.push({
    hash_rate_info: {
      ...getRandomHashrateInfo(),
      name: workerName
    },
    last_share_at: 0,
    status: 0,
    host: newWorker.host
  })
}

function generateRandomizedDataWorkers () {
  const dataWorkers = []
  for (let i = 0; i < 10; i++) {
    dataWorkers.push(getRandomWorkerData())
  }
  dataWorkers.push(getWorkerDataWithSameInfo())

  return dataWorkers
}

function generateRandomTransactions (startDateTimestamp, endDateTimestamp) {
  const transactions = []
  const start = new Date(startDateTimestamp * 1000)
  const end = new Date(endDateTimestamp * 1000)

  eachDayOfInterval({ start, end }).forEach(date => {
    const dateAt1AM = set(date, {
      hours: 1,
      minutes: 0,
      seconds: 0,
      milliseconds: 0
    })
    const transaction = getRandomTransactionData(dateAt1AM, end)
    transactions.push(transaction)
  })

  return transactions
}

function generateHashrateHistory (startTimestamp, endTimestamp) {
  const hashRateList = []
  const start = new Date(startTimestamp * 1000)
  const end = new Date(endTimestamp * 1000)

  eachHourOfInterval({ start, end }).forEach(date => {
    hashRateList.push(getRandomHashrateHistoryItem(date.getTime()))
  })

  return hashRateList
}

function generateAndCacheHashrateHistory (startTimestamp, endTimestamp, state) {
  const cacheKey = `${startTimestamp}-${endTimestamp}`

  if (!state.hashrate_history_cache) {
    state.hashrate_history_cache = {}
  }

  if (state.hashrate_history_cache[cacheKey]) {
    return state.hashrate_history_cache[cacheKey]
  }

  const hashRateList = generateHashrateHistory(startTimestamp, endTimestamp)
  state.hashrate_history_cache[cacheKey] = hashRateList

  return hashRateList
}

function generateAndAddToStateRandomTxs (
  startDateTimestamp,
  endDateTimestamp,
  state
) {
  const newTransactions = generateRandomTransactions(
    startDateTimestamp,
    endDateTimestamp
  )
  newTransactions.forEach(transaction => {
    const randomInt = getRandomInt(0, 500)
    const shouldDuplicateTs = randomInt === 0
    const txAtSameTsExists = Object.values(state.transactions_list).find(
      tx => tx.created_at === transaction.created_at
    )
    if (
      state.transactions_list[transaction.id] ||
      (txAtSameTsExists && !shouldDuplicateTs)
    ) { return }
    state.transactions_list[transaction.id] = transaction
  })
}

function getRandomBalanceInfo () {
  const RANDOM_MIN = 0.000100000000000000
  const RANDOM_MAX = 0.000999999999999999
  const totalIncome = getRandomDecimal(RANDOM_MIN, RANDOM_MAX)
  return {
    balance: getRandomDecimal(RANDOM_MIN, RANDOM_MAX),
    paid: getRandomDecimal(RANDOM_MIN, totalIncome),
    total_income: totalIncome,
    yesterday_income: getRandomDecimal(RANDOM_MIN, RANDOM_MAX),
    estimated_today_income: getRandomDecimal(RANDOM_MIN, RANDOM_MAX)
  }
}

module.exports = {
  generateRandomizedDataWorkers,
  getRandomHashrateInfo,
  addNewWorker,
  generateAndAddToStateRandomTxs,
  getRandomBalanceInfo,
  generateHashrateHistory,
  generateAndCacheHashrateHistory,
  getRandomHashrateHistoryItem
}
