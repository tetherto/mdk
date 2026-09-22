'use strict'

const { setTimeout: sleep } = require('node:timers/promises')
const { sign } = require('./utils')
const { COIN, DEFAULT_API_URL, MASTER_ACCOUNT, PAGE_SIZE, MAX_PAGES, REQUEST_INTERVAL_MS, REQUEST_TIMEOUT_MS } = require('./utils/constants')

const TIME_PATH = '/time'
const HTTP_UNAUTHORIZED = 401

/**
 * The only error type the client throws for transport and payload problems.
 * It deliberately does not wrap the original HTTP error: that object may
 * carry the signed request headers.
 */
class EmcdApiError extends Error {
  constructor (path, status, code) {
    super(`ERR_EMCD_API ${path} ${status} ${code}`)
    this.path = path
    this.status = status
    this.code = code
  }

  static transport (path, err) {
    return new EmcdApiError(path, err.status || 0, 'REQUEST_FAILED')
  }

  /** The server answered, but the payload does not fit the documented shape. */
  static payload (path, code) {
    return new EmcdApiError(path, 200, code)
  }
}

/**
 * @typedef {Object} EmcdApiOptions
 * @property {string} apiKey
 * @property {string} apiSecret
 * @property {string} [apiUrl]            base URL including the version path
 * @property {'btc'} [coin]
 * @property {AbortSignal} [signal]       aborts waits and in-flight requests
 * @property {number} [requestIntervalMs] minimum spacing between requests
 */

/**
 * Read-only client for EMCD Pool API v1.
 *
 * Concurrency model:
 *  - every call goes through one promise chain (`_queue`), so requests from
 *    stats, workers and history polling never interleave;
 *  - `_waitForRateLimit` spaces consecutive requests by `requestIntervalMs`;
 *  - a 401 triggers one clock sync against `/time` and one signed retry.
 */
class EmcdMinerpoolApi {
  /**
   * @param {{ get: Function }} http  HttpFacility
   * @param {EmcdApiOptions} options
   */
  constructor (http, options) {
    const { apiUrl = DEFAULT_API_URL, apiKey, apiSecret, coin = COIN, signal, requestIntervalMs = REQUEST_INTERVAL_MS } = options
    EmcdMinerpoolApi.validateConfig({ apiUrl, apiKey, apiSecret, coin })

    this._http = http
    this._baseUrl = apiUrl.replace(/\/+$/, '')
    this._apiKey = apiKey
    this._apiSecret = apiSecret
    this._signal = signal
    this._requestIntervalMs = requestIntervalMs

    this._clockOffsetMs = 0
    this._nextRequestAt = 0
    this._queue = Promise.resolve()
  }

  static validateConfig ({ apiUrl = DEFAULT_API_URL, apiKey, apiSecret, coin = COIN }) {
    if (!isNonEmptyString(apiKey)) {
      throw new Error('ERR_EMCD_API_KEY_REQUIRED')
    }
    if (!isNonEmptyString(apiSecret)) {
      throw new Error('ERR_EMCD_API_SECRET_REQUIRED')
    }
    if (coin !== COIN) {
      throw new Error('ERR_EMCD_COIN_UNSUPPORTED')
    }
    if (!isPlainHttpUrl(apiUrl)) {
      throw new Error('ERR_EMCD_API_URL_INVALID')
    }
  }

  getHashrate (account) {
    return this._request('/hashrate', account, { period: 'day' })
  }

  getBalance (account) {
    return this._request('/balance', account)
  }

  async getWorkers (account) {
    const path = '/hashrate/workers'
    const data = await this._request(path, account)
    if (!Array.isArray(data?.items)) {
      throw EmcdApiError.payload(path, 'INVALID_WORKERS')
    }
    return data.items
  }

  getEarnings (account, fromTime, toTime) {
    return this._readLedger('/earnings', account, fromTime, toTime)
  }

  getPayouts (account, fromTime, toTime) {
    return this._readLedger('/payouts', account, fromTime, toTime)
  }

  /**
   * Drains every page of a dated ledger endpoint.
   *
   * Earnings are grouped by day *after* pagination, so a short `items` array
   * says nothing about the underlying ledger. Only `totalSize` does.
   * @param {'/earnings'|'/payouts'} path
   * @param {string} fromTime YYYY-MM-DD, inclusive
   * @param {string} toTime   YYYY-MM-DD
   * @returns {Promise<object[]>}
   */
  async _readLedger (path, account, fromTime, toTime) {
    const items = []

    for (let page = 1; page <= MAX_PAGES; page++) {
      const data = await this._request(path, account, { fromTime, toTime, page, pageSize: PAGE_SIZE })
      assertLedgerPage(path, data, page)
      items.push(...data.items)

      const isLastPage = page * PAGE_SIZE >= data.totalSize
      if (isLastPage) {
        return items
      }
    }

    throw EmcdApiError.payload(path, 'PAGE_LIMIT')
  }

  _request (path, account, query = {}) {
    const result = this._queue.then(() => this._sendWithClockSync(path, account, { coin: COIN, ...query }))
    // A failed request must not stall the queue for the next caller.
    this._queue = result.catch(() => {})
    return result
  }

  /**
   * A 401 may be clock drift past the signature window rather than a bad key.
   * Resync against /time once and retry before reporting an auth failure.
   */
  async _sendWithClockSync (path, account, query) {
    try {
      return await this._send(path, account, query)
    } catch (err) {
      if (err.status !== HTTP_UNAUTHORIZED) {
        throw err
      }
    }

    await this._syncClock()

    try {
      return await this._send(path, account, query)
    } catch (err) {
      if (err.status === HTTP_UNAUTHORIZED) {
        throw new Error('ERR_EMCD_AUTH')
      }
      throw err
    }
  }

  async _syncClock () {
    const before = Date.now()
    const clock = await this._send(TIME_PATH)
    const after = Date.now()

    if (!Number.isFinite(clock?.epoch) || clock.epoch <= 0) {
      throw EmcdApiError.payload(TIME_PATH, 'INVALID_TIME')
    }
    this._clockOffsetMs = clock.epoch * 1000 - (before + after) / 2
  }

  async _send (path, account = MASTER_ACCOUNT, query = {}) {
    this._signal?.throwIfAborted()
    await this._waitForRateLimit()

    const url = this._buildUrl(path, query)
    const headers = path === TIME_PATH
      ? { Accept: 'application/json' }
      : this._signedHeaders(account)

    let response
    try {
      response = await this._http.get(url, {
        headers,
        encoding: 'json',
        timeout: REQUEST_TIMEOUT_MS,
        signal: this._signal,
        redirect: false
      })
    } catch (err) {
      this._signal?.throwIfAborted()
      throw EmcdApiError.transport(path, err)
    }

    const { body } = response
    if (path === TIME_PATH) {
      return body
    }

    if (!isSuccessEnvelope(body)) {
      throw EmcdApiError.payload(path, 'INVALID_RESPONSE')
    }
    return body.data
  }

  async _waitForRateLimit () {
    while (this._nextRequestAt > Date.now()) {
      await sleep(this._nextRequestAt - Date.now(), undefined, { signal: this._signal })
    }
    this._nextRequestAt = Date.now() + this._requestIntervalMs
  }

  _buildUrl (path, query) {
    const search = Object.keys(query).length ? `?${new URLSearchParams(query)}` : ''
    return this._baseUrl + path + search
  }

  _signedHeaders (account) {
    const timestamp = String(Math.floor((Date.now() + this._clockOffsetMs) / 1000))
    const headers = {
      Accept: 'application/json',
      'X-API-Key': this._apiKey,
      'X-Timestamp': timestamp,
      'X-Signature': sign({ apiKey: this._apiKey, apiSecret: this._apiSecret, timestamp, subaccountId: account })
    }
    if (account !== MASTER_ACCOUNT) {
      headers['X-Subaccount-ID'] = account
    }
    return headers
  }
}

function isNonEmptyString (value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isPlainHttpUrl (value) {
  let url
  try {
    url = new URL(value)
  } catch {
    return false
  }
  const isHttp = url.protocol === 'http:' || url.protocol === 'https:'
  const hasExtras = url.username || url.password || url.search || url.hash
  return isHttp && !hasExtras
}

function isSuccessEnvelope (body) {
  return Boolean(body) && body.code === 'success' && Object.hasOwn(body, 'data')
}

function assertLedgerPage (path, data, page) {
  const isWellFormed = Array.isArray(data?.items) && Number.isSafeInteger(data.totalSize) && data.totalSize >= 0
  if (!isWellFormed) {
    throw EmcdApiError.payload(path, 'INVALID_PAGE')
  }

  // The page must echo what was requested. A repeated page would be summed
  // twice; a smaller pageSize would end the loop before the ledger is drained.
  if (data.page !== page || data.pageSize !== PAGE_SIZE) {
    throw EmcdApiError.payload(path, 'INVALID_PAGE')
  }

  // An empty page while the ledger still has rows means silent truncation.
  const shouldHaveRows = data.totalSize > (page - 1) * PAGE_SIZE
  if (shouldHaveRows && data.items.length === 0) {
    throw EmcdApiError.payload(path, 'INCOMPLETE_PAGE')
  }
}

module.exports = EmcdMinerpoolApi
module.exports.EmcdApiError = EmcdApiError
