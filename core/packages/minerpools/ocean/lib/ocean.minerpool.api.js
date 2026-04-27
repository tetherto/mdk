'use strict'

const { setTimeout: sleep } = require('timers/promises')

class OceanMinerpoolApi {
  constructor (http) {
    this._http = http
  }

  async _request (apiPath) {
    // waiting between calls due to api rate limits (skipped in tests)
    if (process.env.NODE_ENV !== 'test') {
      await sleep(1000)
    }
    const { body: resp } = await this._http.get(apiPath, { encoding: 'json' })
    return resp.result
  }

  async getHashRateInfo (username) {
    return this._request(`/v1/user_hashrate/${username}`)
  }

  async getWorkers (username) {
    return this._request(`/v1/user_hashrate_full/${username}`)
  }

  async getMonthlyEarnings (username, month) {
    return this._request(`/v1/monthly_earnings_report/${username}/${month}`)
  }

  async getTransactions (username, start, end) {
    return await this._request(`/v1/earnpay/${username}/${start}/${end}`)
  }

  async getBlocks () {
    return await this._request('/v1/blocks')
  }

  async getEarnings (username, startTime) {
    return await this._request(`/v1/earnpay/${username}/${startTime}`)
  }
}

module.exports = OceanMinerpoolApi
