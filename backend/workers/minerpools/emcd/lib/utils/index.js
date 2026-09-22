'use strict'

const { createHmac } = require('node:crypto')
const { DAY_MS } = require('./constants')

const DECIMAL_STRING = /^-?\d+(\.\d+)?$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// Go's omitempty drops `active: 0`, so an absent flag means "offline".
const WORKER_ACTIVE_FLAGS = [undefined, 0, 1]

/**
 * Raw worker row from GET /hashrate/workers.
 * @typedef {Object} EmcdWorker
 * @property {string} worker       "<account>.<rig>", unique per account
 * @property {string} [workerName] rig name without the account prefix
 * @property {0|1} [active]        omitted by the API when 0
 * @property {number} lastbeat     unix seconds of the last share
 * @property {number|string} hashrate
 * @property {number|string} hashrate1h
 * @property {number|string} hashrate24h
 */

/**
 * Normalized worker shared with the other pool workers.
 * @typedef {Object} WorkerStats
 * @property {string} username
 * @property {string} id
 * @property {string} name
 * @property {0|1} online
 * @property {number} last_updated unix seconds
 * @property {number} hashrate
 * @property {number} hashrate_1h
 * @property {number} hashrate_24h
 */

class DataError extends Error {
  constructor (field) {
    super(`ERR_EMCD_DATA ${field}`)
    this.field = field
  }
}

function sign ({ apiKey, apiSecret, timestamp, subaccountId = '' }) {
  return createHmac('sha256', apiSecret)
    .update(apiKey + timestamp + subaccountId)
    .digest('hex')
}

function isNumericValue (value) {
  if (typeof value === 'number') {
    return Number.isFinite(value)
  }
  if (typeof value === 'string') {
    // The regex admits digit strings too long for a double, e.g. 400 nines.
    return DECIMAL_STRING.test(value) && Number.isFinite(Number(value))
  }
  return false
}

/**
 * A missing or malformed reading must never become a valid zero.
 * @param {unknown} value number or decimal string
 * @param {string} field  reported in the error message
 * @returns {number}
 */
function toNumber (value, field) {
  if (!isNumericValue(value)) {
    throw new DataError(field)
  }
  return Number(value)
}

function isIsoDate (value) {
  return typeof value === 'string' && ISO_DATE.test(value)
}

function toTimestamp (value, field) {
  const ms = Date.parse(value)
  if (!Number.isFinite(ms)) {
    throw new DataError(field)
  }
  return ms
}

function dateString (time) {
  return new Date(time).toISOString().slice(0, 10)
}

function monthKey (time) {
  const date = new Date(time)
  return `${date.getUTCMonth() + 1}-${date.getUTCFullYear()}`
}

/**
 * The completed UTC day before `time`.
 * @returns {{ start: number, end: number, date: string }} [start, end) in ms and YYYY-MM-DD
 */
function previousDay (time) {
  const end = Date.parse(dateString(time))
  const start = end - DAY_MS
  return { start, end, date: dateString(start) }
}

/**
 * Twelve months ending with the month of `time`, newest first.
 * @returns {Array<{ month: string, start: number }>} `month` is "M-YYYY"
 */
function getMonthlyDateRanges (time) {
  const date = new Date(time)
  return Array.from({ length: 12 }, (_, monthsAgo) => {
    const start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - monthsAgo, 1)
    return { month: monthKey(start), start }
  })
}

function isValidWorker (worker) {
  return Boolean(worker) &&
    typeof worker.worker === 'string' &&
    worker.worker.length > 0 &&
    WORKER_ACTIVE_FLAGS.includes(worker.active)
}

/**
 * @param {EmcdWorker} worker
 * @returns {WorkerStats}
 */
function toWorkerStats (worker, username) {
  if (!isValidWorker(worker)) {
    throw new DataError('worker')
  }

  return {
    username,
    id: worker.worker,
    name: worker.workerName || worker.worker,
    online: worker.active === 1 ? 1 : 0,
    last_updated: toNumber(worker.lastbeat, 'worker.lastbeat'),
    hashrate: toNumber(worker.hashrate, 'worker.hashrate'),
    hashrate_1h: toNumber(worker.hashrate1h, 'worker.hashrate1h'),
    hashrate_24h: toNumber(worker.hashrate24h, 'worker.hashrate24h')
  }
}

/**
 * @param {EmcdWorker[]} workers
 * @returns {WorkerStats[]}
 */
function getWorkersStats (workers, username) {
  return workers.map(worker => toWorkerStats(worker, username))
}

module.exports = {
  DataError,
  sign,
  toNumber,
  toTimestamp,
  isIsoDate,
  dateString,
  monthKey,
  previousDay,
  getMonthlyDateRanges,
  getWorkersStats
}
