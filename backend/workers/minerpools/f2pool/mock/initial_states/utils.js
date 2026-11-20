'use strict'

const { eachHourOfInterval } = require('date-fns')
const { convertMsToSeconds } = require('../../lib/utils')
const crypto = require('crypto')

const DAY_MS = 24 * 60 * 60 * 1000

// Satoshi precision. Every getRandomDecimal caller is a BTC amount or a fee
// rate whose whole range sits below 0.01, so rounding any coarser than this
// quantises the range away.
const BTC_DECIMALS = 8

// Mock pool figures, so there is nothing here to keep unguessable and no
// reason to draw them from the CSPRNG. Deriving a float by dividing random
// bytes also reads as a biased-randomness defect to a scanner, which is noise
// on a generator of development data. `crypto.randomInt` below stays: it is
// unbiased by construction and ids have to be collision-free.
function randomFloat () {
  return Math.random()
}

// Uniform integer in [min, max]. randomFloat() is strictly below 1, so the
// floor never reaches max - min + 1 and the result never overruns max.
function getRandomInt (min, max) {
  return Math.floor(randomFloat() * (max - min + 1)) + min
}

// Uniform value in [min, max], rounded to satoshis rather than to 2 decimals:
// the pool fields this feeds are fractions of a BTC, and at 2 decimals every
// draw rounded to zero and collapsed onto `min`, so a reporting app reading
// the mock saw one flat payout repeated for every day of its history.
function getRandomDecimal (min, max) {
  return parseFloat((randomFloat() * (max - min) + min).toFixed(BTC_DECIMALS))
}

function getRandomIntTimestamp (minDate, maxDate) {
  return getRandomInt(minDate.getTime(), maxDate.getTime())
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
    // Unbiased and full-precision: a repeated id makes
    // generateAndAddToStateRandomTxs skip that day's row.
    id: crypto.randomInt(100000000, 1000000000),
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

function generateRandomizedDataWorkers (workerCount) {
  const dataWorkers = []
  const count = workerCount != null ? Math.max(workerCount - 1, 0) : 10
  for (let i = 0; i < count; i++) {
    dataWorkers.push(getRandomWorkerData())
  }
  dataWorkers.push(getWorkerDataWithSameInfo())

  return dataWorkers
}

function generateRandomTransactions (startDateTimestamp, endDateTimestamp) {
  const transactions = []
  const startMs = startDateTimestamp * 1000
  const end = new Date(endDateTimestamp * 1000)

  // F2Pool settles revenue once a day at 00:00 UTC, so one row per UTC day,
  // whatever timezone the mock runs in.
  for (let day = startMs - (startMs % DAY_MS); day <= end.getTime(); day += DAY_MS) {
    transactions.push(getRandomTransactionData(new Date(day), end))
  }

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
