'use strict'

const test = require('brittle')
const fastify = require('fastify')
const { createHmac } = require('node:crypto')
const routes = require('../../mock/routers/base')
const defaultState = require('../../mock/initial_states/default')
const keys = require('../../mock/lib/test-keys')

function headers (account = '', timestamp = String(Math.floor(Date.now() / 1000))) {
  return {
    'X-API-Key': keys.apiKey,
    'X-Timestamp': timestamp,
    'X-Signature': createHmac('sha256', keys.apiSecret).update(keys.apiKey + timestamp + account).digest('hex'),
    ...(account ? { 'X-Subaccount-ID': account } : {})
  }
}

test('mock enforces signature, timestamp and account ownership; /time is public', async t => {
  const app = fastify()
  t.teardown(() => app.close())
  app.register(routes, { accounts: { '': defaultState(), sub: defaultState() } })
  const url = '/pool/v1/balance?coin=btc'
  t.is((await app.inject({ url: '/pool/v1/time' })).statusCode, 200)
  t.is((await app.inject({ url })).statusCode, 401)
  t.is((await app.inject({ url, headers: headers() })).statusCode, 200)
  t.is((await app.inject({ url, headers: headers('sub') })).statusCode, 200)
  t.is((await app.inject({ url, headers: headers('', '1') })).statusCode, 401)
  t.is((await app.inject({ url, headers: { ...headers(), 'X-Subaccount-ID': 'sub' } })).statusCode, 401)
  t.is((await app.inject({ url, headers: headers('unknown') })).statusCode, 403)
})

test('mock groups earnings after pagination like the API ledger', async t => {
  const app = fastify()
  t.teardown(() => app.close())
  const data = defaultState()
  data.earnings = Array.from({ length: 201 }, () => ({ date: '2026-09-21', totalAmount: 1 }))
  app.register(routes, { accounts: { '': data } })
  const response = await app.inject({
    url: '/pool/v1/earnings?coin=btc&fromTime=2026-09-21&toTime=2026-09-21&page=2&pageSize=100',
    headers: headers()
  })
  t.alike(response.json().data, { items: [{ date: '2026-09-21', totalAmount: 100 }], page: 2, pageSize: 100, totalSize: 201 })
})
