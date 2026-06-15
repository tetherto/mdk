'use strict'

const { CURRENCY } = require('./utils/constants')
const { setTimeout: sleep } = require('timers/promises')
const { convertMsToSeconds } = require('./utils')

/**
 * @see https://api.f2pool.com/v2/doc/en.html
 */
class F2MinerpoolApi {
  constructor (http, apiSecret) {
    this._http = http
    this.apiSecret = apiSecret
  }

  async _request (apiPath, payload) {
    // waiting between calls due to api rate limits (skipped in tests)
    if (process.env.NODE_ENV !== 'test') {
      await sleep(1000)
    }
    const { body: resp } = await this._http.post(apiPath, {
      headers: { 'F2P-API-SECRET': this.apiSecret },
      encoding: 'json',
      body: payload,
      timeout: 30 * 1000
    })

    return resp
  }

  async getBalance (username) {
    return this._request('/v2/assets/balance', {
      mining_user_name: username,
      currency: CURRENCY
    })
  }

  async getHashRateInfo (username) {
    return this._request('/v2/hash_rate/info', {
      mining_user_name: username,
      currency: CURRENCY
    })
  }

  /**
   * Get hashrate history for a given time range
   * @param {string} username - Mining username
   * @param {number} start - Start timestamp in milliseconds
   * @param {number} end - End timestamp in milliseconds
   * @returns {Promise<Object>} Hashrate history data
   */
  async getHashRateHistory (username, start, end) {
    return this._request('/v2/hash_rate/history', {
      mining_user_name: username,
      currency: CURRENCY,
      start_time: convertMsToSeconds(start),
      end_time: convertMsToSeconds(end)
    })
  }

  async getWorkers (username) {
    const res = await this._request('/v2/hash_rate/worker/list', {
      mining_user_name: username,
      currency: CURRENCY
    })

    return res.workers || []
  }

  async getTransactions (start, end, type, username) {
    const res = await this._request('/v2/assets/transactions/list', {
      mining_user_name: username,
      currency: CURRENCY,
      type,
      start_time: convertMsToSeconds(start),
      end_time: convertMsToSeconds(end)
    })
    return res.transactions || []
  }
}

module.exports = F2MinerpoolApi
