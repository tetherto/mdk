'use strict'

const test = require('brittle')
const OceanMinerpoolApi = require('../../lib/ocean.minerpool.api')

function makeHttp (handler) {
  return {
    get: async (apiPath, opts) => {
      const result = handler(apiPath, opts)
      return { body: { result } }
    }
  }
}

test('getHashRateInfo GETs user hashrate path', async (t) => {
  const http = makeHttp((path) => {
    t.is(path, '/v1/user_hashrate/miner1')
    return { hashrate_60s: '10' }
  })
  const api = new OceanMinerpoolApi(http)
  const res = await api.getHashRateInfo('miner1')
  t.is(res.hashrate_60s, '10')
})

test('getWorkers GETs full hashrate path', async (t) => {
  const http = makeHttp((path) => {
    t.is(path, '/v1/user_hashrate_full/u')
    return { snap_ts: 1, workers: {} }
  })
  const api = new OceanMinerpoolApi(http)
  await api.getWorkers('u')
})

test('getMonthlyEarnings GETs monthly report path', async (t) => {
  const http = makeHttp((path) => {
    t.is(path, '/v1/monthly_earnings_report/u/2024-1')
    return { report: [] }
  })
  const api = new OceanMinerpoolApi(http)
  await api.getMonthlyEarnings('u', '2024-1')
})

test('getTransactions with start and end uses three-segment path', async (t) => {
  const http = makeHttp((path) => {
    t.is(path, '/v1/earnpay/u/1000/2000')
    return { earnings: [] }
  })
  const api = new OceanMinerpoolApi(http)
  await api.getTransactions('u', 1000, 2000)
})

test('getBlocks GETs blocks path', async (t) => {
  const http = makeHttp((path) => {
    t.is(path, '/v1/blocks')
    return { blocks: [] }
  })
  const api = new OceanMinerpoolApi(http)
  await api.getBlocks()
})

test('getEarnings GETs two-segment earnpay path', async (t) => {
  const http = makeHttp((path) => {
    t.is(path, '/v1/earnpay/u/500')
    return { earnings: [], payouts: [] }
  })
  const api = new OceanMinerpoolApi(http)
  await api.getEarnings('u', 500)
})

test('_request unwraps result and skips sleep in test env', async (t) => {
  const http = {
    get: async (path, opts) => {
      t.is(path, '/v1/ping')
      t.is(opts.encoding, 'json')
      return { body: { result: { ok: true } } }
    }
  }
  const api = new OceanMinerpoolApi(http)
  const res = await api._request('/v1/ping')
  t.is(res.ok, true)
})
