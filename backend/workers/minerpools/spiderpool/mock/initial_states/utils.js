'use strict'

const { eachDayOfInterval, eachHourOfInterval, set } = require('date-fns')
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
  return Math.floor(randomNumber() * (maxTime - minTime + 1)) + minTime
}

// The real API serializes hashrates as decimal strings in H/s
function getRandomHashrateStr () {
  return `${getRandomInt(100000000000000, 999999999999999)}.${getRandomInt(10, 99)}`
}

function getRandomRateStr () {
  return getRandomDecimal(0.0001, 0.009).toFixed(6)
}

function getRandomFullHashRate () {
  return {
    hashRate10: getRandomHashrateStr(),
    staleRate10: getRandomRateStr(),
    rejectRate10: getRandomRateStr(),
    hashRateHour: getRandomHashrateStr(),
    staleRateHour: getRandomRateStr(),
    rejectRateHour: getRandomRateStr(),
    hashRateDay: getRandomHashrateStr(),
    staleRateDay: getRandomRateStr(),
    rejectRateDay: getRandomRateStr(),
    lastShareTime: convertMsToSeconds(Date.now())
  }
}

function getRandomProfitInfo () {
  const RANDOM_MIN = 0.000100000000000000
  const RANDOM_MAX = 0.000999999999999999
  return {
    yesterdayProfit: getRandomDecimal(RANDOM_MIN, RANDOM_MAX),
    unpaidProfit: getRandomDecimal(RANDOM_MIN, RANDOM_MAX),
    totalProfit: getRandomDecimal(RANDOM_MIN, RANDOM_MAX),
    dayEstimateProfit: getRandomDecimal(RANDOM_MIN, RANDOM_MAX)
  }
}

function getRandomWorkerData (subaccount, workerName) {
  return {
    subaccount,
    workerName: workerName || `worker-${getRandomInt(1000, 9999)}`,
    minuteHashRate: getRandomHashrateStr(),
    minuteStaleRate: getRandomRateStr(),
    minuteRejectRate: getRandomRateStr(),
    hourHashRate: getRandomHashrateStr(),
    hourStaleRate: getRandomRateStr(),
    hourRejectRate: getRandomRateStr(),
    dayHashRate: getRandomHashrateStr(),
    dayStaleRate: getRandomRateStr(),
    dayRejectRate: getRandomRateStr(),
    lastShareTime: convertMsToSeconds(Date.now()),
    status: getRandomInt(0, 1) === 0 ? 'online' : 'offline'
  }
}

function generateRandomizedDataWorkers (subaccount, workerCount) {
  const dataWorkers = []
  const count = workerCount != null ? Math.max(workerCount - 1, 0) : 10
  for (let i = 0; i < count; i++) {
    dataWorkers.push(getRandomWorkerData(subaccount))
  }
  // one stable, always-online worker so tests have a deterministic row
  dataWorkers.push({ ...getRandomWorkerData(subaccount, 'worker-001'), status: 'online' })

  return dataWorkers
}

function addNewWorker (workers, subaccount, newWorker) {
  if (!newWorker.name) {
    throw new Error('ERR_INVALID_NAME')
  }

  const workerName = newWorker.name.split('.')[1] || newWorker.name

  if (workers.findIndex(wrk => wrk.workerName === workerName) > -1) {
    throw new Error('ERR_WORKER_EXISTS')
  }

  workers.push({ ...getRandomWorkerData(subaccount, workerName), status: 'online' })
}

function getRandomPaymentRecord (minDate, maxDate) {
  return {
    paymentDate: getRandomIntTimestamp(minDate, maxDate),
    paymentAddress: 'mv8W2k7UMkqbHbfbvRXcEzaehPGvZCmkV5',
    paymentMoney: getRandomDecimal(0.0001, 0.0009),
    txId: crypto.randomBytes(32).toString('hex')
  }
}

function generateRandomPayments (startTimestamp, endTimestamp) {
  const payments = []
  const start = new Date(startTimestamp)
  const end = new Date(endTimestamp)

  eachDayOfInterval({ start, end }).forEach(date => {
    const dateAt1AM = set(date, {
      hours: 1,
      minutes: 0,
      seconds: 0,
      milliseconds: 0
    })
    payments.push(getRandomPaymentRecord(dateAt1AM, dateAt1AM))
  })

  return payments
}

function generateAndAddToStateRandomPayments (startTimestamp, endTimestamp, state) {
  const newPayments = generateRandomPayments(startTimestamp, endTimestamp)
  newPayments.forEach(payment => {
    const paymentAtSameTsExists = Object.values(state.payment_records).find(
      p => p.paymentDate === payment.paymentDate
    )
    if (state.payment_records[payment.txId] || paymentAtSameTsExists) return
    state.payment_records[payment.txId] = payment
  })
}

function getRandomHashrateChartItem (subaccount, timestamp) {
  return {
    subaccount,
    hashRate: getRandomHashrateStr(),
    staleRate: getRandomRateStr(),
    rejectRate: getRandomRateStr(),
    secondTimestamp: convertMsToSeconds(timestamp),
    lastShareTime: convertMsToSeconds(timestamp)
  }
}

function generateHashrateChart (subaccount, startTimestamp, endTimestamp) {
  const chart = []
  const start = new Date(startTimestamp)
  const end = new Date(endTimestamp)

  eachHourOfInterval({ start, end }).forEach(date => {
    chart.push(getRandomHashrateChartItem(subaccount, date.getTime()))
  })

  return chart
}

function generateAndCacheHashrateChart (subaccount, startTimestamp, endTimestamp, state) {
  const cacheKey = `${subaccount}-${startTimestamp}-${endTimestamp}`

  if (!state.hashrate_chart_cache) {
    state.hashrate_chart_cache = {}
  }

  if (state.hashrate_chart_cache[cacheKey]) {
    return state.hashrate_chart_cache[cacheKey]
  }

  const chart = generateHashrateChart(subaccount, startTimestamp, endTimestamp)
  state.hashrate_chart_cache[cacheKey] = chart

  return chart
}

module.exports = {
  getRandomFullHashRate,
  getRandomProfitInfo,
  getRandomWorkerData,
  generateRandomizedDataWorkers,
  addNewWorker,
  generateAndAddToStateRandomPayments,
  generateHashrateChart,
  generateAndCacheHashrateChart
}
