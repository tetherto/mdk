'use strict'

const crypto = require('crypto')
const {
  isCurrentMonth,
  convertMsToSeconds,
  getTimeRanges
} = require('../../../../../core/mdk/lib/services/pool-utils/time')
const { WORKER_STATUS, SUCCESS_CODES } = require('./constants')

/**
 * True when a response envelope reports success. SpiderPool is inconsistent
 * across endpoint namespaces (see SUCCESS_CODES), so match on the set rather
 * than a single literal.
 * @param {string|number} code
 * @returns {boolean}
 */
function isSuccessCode (code) {
  return SUCCESS_CODES.includes(code)
}

const PEM_LABELS = ['PRIVATE KEY', 'RSA PRIVATE KEY']

/**
 * Accepts the private key in whichever shape it arrives and returns a usable
 * KeyObject. The SpiderPool console hands out a bare base64 PKCS#8 body (what
 * Java's PKCS8EncodedKeySpec eats) with no PEM armour, while config files and
 * env vars often carry PEM with literal "\n" escapes — both are normalized
 * here so callers can paste the key verbatim.
 *
 * @param {string|crypto.KeyObject} key
 * @returns {crypto.KeyObject}
 */
function normalizePrivateKey (key) {
  if (key && typeof key === 'object' && key.asymmetricKeyType) return key
  if (typeof key !== 'string' || !key.trim()) {
    throw new Error('ERR_SPIDERPOOL_PRIVATE_KEY_MISSING')
  }

  // JSON config and shell env vars commonly escape the newlines
  const text = key.trim().replace(/\\n/g, '\n')

  if (text.includes('-----BEGIN')) {
    try {
      return crypto.createPrivateKey(text)
    } catch (e) {
      throw new Error(`ERR_SPIDERPOOL_PRIVATE_KEY_INVALID: PEM block could not be parsed (${e.message})`)
    }
  }

  // Bare base64 body: re-wrap it and let each candidate label prove itself.
  const b64 = text.replace(/\s+/g, '')
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) {
    throw new Error('ERR_SPIDERPOOL_PRIVATE_KEY_INVALID: expected a PEM block or a bare base64 key body')
  }
  const body = b64.match(/.{1,64}/g).join('\n')
  for (const label of PEM_LABELS) {
    try {
      return crypto.createPrivateKey(`-----BEGIN ${label}-----\n${body}\n-----END ${label}-----\n`)
    } catch (e) {
      // try the next encoding
    }
  }

  throw new Error('ERR_SPIDERPOOL_PRIVATE_KEY_INVALID: base64 body is neither PKCS#8 nor PKCS#1 RSA')
}

/**
 * SpiderPool returns hashrates and rates as decimal strings
 * (e.g. "3832641468476948.48"); normalize to a finite number.
 * @param {string|number} value
 * @returns {number}
 */
function toNumber (value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/**
 * @typedef {Object} Worker SpiderPool /v2/sp/hashrate/worker/list record
 * @property {string} subaccount
 * @property {string} workerName
 * @property {string} minuteHashRate
 * @property {string} hourHashRate
 * @property {string} hourStaleRate
 * @property {string} dayHashRate
 * @property {string} dayStaleRate
 * @property {number} lastShareTime
 * @property {string} status "online" | "offline"
 */

/**
 * @typedef {Object} WorkerStats
 * @property {string} id
 * @property {string} name
 * @property {number} online
 * @property {number} last_updated
 * @property {number} hashrate
 * @property {number} hashrate_1h
 * @property {number} hashrate_24h
 * @property {number} hashrate_stale_1h
 * @property {number} hashrate_stale_24h
 */

/**
 * @param {Worker[]} workers
 * @returns {WorkerStats[]}
 */
function getWorkersStats (workers, username) {
  return workers.map(w => {
    const hashRate1h = toNumber(w.hourHashRate)
    const hashRate24h = toNumber(w.dayHashRate)
    return {
      username,
      id: w.workerName,
      name: w.workerName,
      online: w.status === WORKER_STATUS.ONLINE ? 1 : 0,
      last_updated: w.lastShareTime,
      hashrate: toNumber(w.minuteHashRate),
      hashrate_1h: hashRate1h,
      hashrate_24h: hashRate24h,
      // SpiderPool reports stale as a share ratio; convert to a stale hashrate
      hashrate_stale_1h: hashRate1h * toNumber(w.hourStaleRate),
      hashrate_stale_24h: hashRate24h * toNumber(w.dayStaleRate)
    }
  })
}

const getMonthlyDateRanges = (months) => {
  const dateRange = {}
  const today = new Date()
  for (let i = 0; i < months; i++) {
    const startDate = new Date(today.getFullYear(), today.getMonth() - i, 1, 0, 0, 0)
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1, 0, 0, 0)
    dateRange[`${startDate.getMonth() + 1}-${startDate.getFullYear()}`] = {
      startDate: startDate.getTime(),
      endDate: endDate.getTime()
    }
  }

  return dateRange
}

module.exports = {
  toNumber,
  isSuccessCode,
  normalizePrivateKey,
  getWorkersStats,
  getMonthlyDateRanges,
  isCurrentMonth,
  convertMsToSeconds,
  getTimeRanges
}
