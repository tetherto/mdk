'use strict'

const test = require('brittle')
const F2MinerpoolApi = require('../../lib/f2.minerpool.api')
const { CURRENCY } = require('../../lib/utils/constants')

function makeHttp (handler) {
  return {
    post: async (apiPath, opts) => {
      const body = handler(apiPath, opts)
      return { body }
    }
  }
}

test('getBalance posts mining user and currency', async (t) => {
  const http = makeHttp((path, opts) => {
    t.is(path, '/v2/assets/balance')
    t.is(opts.body.mining_user_name, 'miner1')
    t.is(opts.body.currency, CURRENCY)
    return { balance_info: { total_income: 1 } }
  })
  const api = new F2MinerpoolApi(http, 'secret')
  const res = await api.getBalance('miner1')
  t.is(res.balance_info.total_income, 1)
})

test('getHashRateInfo posts correct path', async (t) => {
  const http = makeHttp((path) => {
    t.is(path, '/v2/hash_rate/info')
    return {}
  })
  const api = new F2MinerpoolApi(http, 's')
  await api.getHashRateInfo('u')
})

test('getHashRateHistory converts times to seconds', async (t) => {
  const http = makeHttp((path, opts) => {
    t.is(path, '/v2/hash_rate/history')
    t.is(opts.body.start_time, 1000)
    t.is(opts.body.end_time, 2000)
    return { hash_rate_list: [] }
  })
  const api = new F2MinerpoolApi(http, 's')
  await api.getHashRateHistory('u', 1000000, 2000000)
})

test('getWorkers returns workers array from response', async (t) => {
  const http = makeHttp(() => ({
    workers: [{ host: 'h' }]
  }))
  const api = new F2MinerpoolApi(http, 's')
  const w = await api.getWorkers('u')
  t.is(w.length, 1)
  t.is(w[0].host, 'h')
})

test('getWorkers returns empty array when response has no workers', async (t) => {
  const http = makeHttp(() => ({}))
  const api = new F2MinerpoolApi(http, 's')
  const w = await api.getWorkers('u')
  t.is(w.length, 0)
})

test('getTransactions returns transactions from response', async (t) => {
  const http = makeHttp((path, opts) => {
    t.is(path, '/v2/assets/transactions/list')
    t.is(opts.body.type, 'revenue')
    return { transactions: [{ id: 1 }] }
  })
  const api = new F2MinerpoolApi(http, 's')
  const tx = await api.getTransactions(1000, 2000, 'revenue', 'u')
  t.is(tx.length, 1)
  t.is(tx[0].id, 1)
})

test('getTransactions returns empty when missing', async (t) => {
  const http = makeHttp(() => ({}))
  const api = new F2MinerpoolApi(http, 's')
  const tx = await api.getTransactions(1, 2, 'revenue', 'u')
  t.is(tx.length, 0)
})

test('_request sends secret header and skips sleep in test env', async (t) => {
  const http = makeHttp((path, opts) => {
    t.is(opts.headers['F2P-API-SECRET'], 'mysecret')
    t.is(opts.encoding, 'json')
    return { ok: true }
  })
  const api = new F2MinerpoolApi(http, 'mysecret')
  const res = await api._request('/x', { a: 1 })
  t.is(res.ok, true)
})
