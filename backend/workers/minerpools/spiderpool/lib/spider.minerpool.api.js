'use strict'

const crypto = require('crypto')
const { setTimeout: sleep } = require('timers/promises')
const { COIN, PAGE_SIZE } = require('./utils/constants')
const { normalizePrivateKey, isSuccessCode } = require('./utils')

/**
 * @see https://support.spiderpool.com/spiderpool-api/miningpool-api
 *
 * Every SpiderPool endpoint is a POST with a unified envelope:
 *   { dataJson, accessKey, timestamp, sign }
 * where dataJson is the JSON-serialized params and sign is the base64
 * MD5withRSA signature of `${dataJson}|${timestamp}` made with the
 * account's RSA private key (accessKey + keypair come from the
 * SpiderPool website's Account Management section).
 *
 * Responses use { code, msg, data }. The success code is not uniform:
 * /v2/subaccount/* answers "SUCCESS" while /v2/sp/* answers 200, so
 * isSuccessCode matches against the full SUCCESS_CODES set.
 */
class SpiderMinerpoolApi {
  constructor (http, { accessKey, privateKey, coin, signal } = {}) {
    this._http = http
    this.accessKey = accessKey
    // accepts the console's bare base64 body as well as a PEM block
    this.privateKey = normalizePrivateKey(privateKey)
    this.coin = coin || COIN
    this._signal = signal
  }

  _sign (dataJson, timestamp) {
    const signer = crypto.createSign('MD5')
    signer.update(`${dataJson}|${timestamp}`, 'utf8')
    return signer.sign(this.privateKey, 'base64')
  }

  async _request (apiPath, params) {
    // waiting between calls due to api rate limits (skipped in tests)
    if (process.env.NODE_ENV !== 'test') {
      await sleep(1000, undefined, { signal: this._signal })
    }
    const dataJson = JSON.stringify({ coin: this.coin, ...params })
    const timestamp = Date.now()
    const { body: resp } = await this._http.post(apiPath, {
      encoding: 'json',
      body: {
        dataJson,
        accessKey: this.accessKey,
        timestamp,
        sign: this._sign(dataJson, timestamp)
      },
      timeout: 30 * 1000,
      signal: this._signal
    })

    if (!resp || !isSuccessCode(resp.code)) {
      const detail = resp
        ? [resp.code, resp.msg].filter(v => v !== undefined && v !== null && v !== '').join(' ') || 'UNKNOWN_ERROR'
        : 'EMPTY_RESPONSE'
      throw new Error(`ERR_SPIDERPOOL_API ${apiPath} ${detail}`)
    }
    return resp.data
  }

  /**
   * Profit summary: yesterdayProfit, unpaidProfit, totalProfit,
   * dayEstimateProfit (all in BTC).
   */
  async getProfitInfo (subaccount) {
    return this._request('/v2/subaccount/getSubaccountProfitInfo', { subaccount })
  }

  /**
   * 10-min / 1-hour / 24-hour average hashrates plus stale/reject ratios
   * for the subaccount. Hashrates are H/s decimal strings.
   */
  async getFullHashRate (subaccount) {
    return this._request('/v2/sp/hashrate/subaccount/fullHashRate', { subaccount })
  }

  /**
   * Hashrate chart points for a time range.
   * @param {string} subaccount
   * @param {number} start - Start timestamp in milliseconds
   * @param {number} end - End timestamp in milliseconds
   * @param {string} [timeLevel] - "hour" or "day"
   */
  async getHashRateHistory (subaccount, start, end, timeLevel = 'hour') {
    const res = await this._request('/v2/sp/hashrate/subaccount/timeRangeHashRateChart', {
      subaccount,
      timeLevel,
      startTimestamp: start,
      endTimestamp: end
    })
    return res || []
  }

  /**
   * All workers of the subaccount (paginated endpoint, drained here).
   */
  async getWorkers (subaccount) {
    const workers = []
    let pageNum = 1
    while (true) {
      const res = await this._request('/v2/sp/hashrate/worker/list', {
        subaccount,
        pageNum,
        pageSize: PAGE_SIZE
      }) || {}
      const records = res.records || []
      workers.push(...records)
      if (!records.length || pageNum >= (res.pages || 1)) break
      pageNum++
    }
    return workers
  }

  /**
   * Payment records in a time range (paginated endpoint, drained here).
   * @param {string} subaccount
   * @param {number} start - Start timestamp in milliseconds
   * @param {number} end - End timestamp in milliseconds
   */
  async getPaymentRecords (subaccount, start, end) {
    const records = []
    let pageNumber = 1
    while (true) {
      const res = await this._request('/v2/subaccount/getSubaccountPaymentRecord', {
        subaccount,
        startTimestamp: start,
        endTimestamp: end,
        pageNumber,
        pageSize: PAGE_SIZE
      }) || {}
      const list = res.list || []
      records.push(...list)
      if (!list.length || records.length >= (res.total || 0)) break
      pageNumber++
    }
    return records
  }
}

module.exports = SpiderMinerpoolApi
