'use strict'

const test = require('brittle')
const registerRoutes = require('../../mock/routers/base')

function makeRoutes () {
  const routes = {}
  registerRoutes({
    post: (path, handler) => {
      routes[path] = handler
    }
  })
  return routes
}

function makeRes () {
  const sent = []
  return { sent, send: (x) => sent.push(x) }
}

function makeReq (body, state) {
  return { body, state, ctx: { usernames: ['u1'] } }
}

const CURRENCY = 'bitcoin'

test('balance rejects missing or unknown currency', (t) => {
  const routes = makeRoutes()
  let res = makeRes()
  routes['/v2/assets/balance'](makeReq({ mining_user_name: 'u1' }, { balance_info: {} }), res)
  t.is(res.sent[0].code, 5001)

  res = makeRes()
  routes['/v2/assets/balance'](makeReq({ currency: 'dogecoin', mining_user_name: 'u1' }, { balance_info: {} }), res)
  t.is(res.sent[0].code, 5001)
})

test('balance rejects unknown mining user', (t) => {
  const routes = makeRoutes()
  const res = makeRes()
  routes['/v2/assets/balance'](makeReq({ currency: CURRENCY, mining_user_name: 'nobody' }, { balance_info: {} }), res)
  t.is(res.sent[0].code, 5010)
})

test('balance accepts pool-level username outside ctx list', (t) => {
  const routes = makeRoutes()
  const res = makeRes()
  routes['/v2/assets/balance'](makeReq({ currency: CURRENCY, mining_user_name: 'haven7346' }, { balance_info: { paid: 1 } }), res)
  t.is(res.sent.length, 1)
  t.is(res.sent[0].balance_info.paid, 1)
})

test('balance replies B001 on state error', (t) => {
  const routes = makeRoutes()
  const res = makeRes()
  routes['/v2/assets/balance'](makeReq({ currency: CURRENCY, mining_user_name: 'u1' }, undefined), res)
  t.is(res.sent[0].code, 'B001')
})

test('hash_rate/info sets name and replies B001 on state error', (t) => {
  const routes = makeRoutes()
  let res = makeRes()
  routes['/v2/hash_rate/info'](makeReq({ currency: CURRENCY, mining_user_name: 'u1' }, { hashrate_info: { info: { name: '' } } }), res)
  t.is(res.sent[0].info.name, 'u1')

  res = makeRes()
  routes['/v2/hash_rate/info'](makeReq({ currency: CURRENCY, mining_user_name: 'u1' }, undefined), res)
  t.is(res.sent[0].code, 'B001')
})

test('hash_rate/history requires start_time and end_time', (t) => {
  const routes = makeRoutes()
  const nowSec = Math.floor(Date.now() / 1000)
  let res = makeRes()
  routes['/v2/hash_rate/history'](makeReq({ currency: CURRENCY, mining_user_name: 'u1', end_time: nowSec }, {}), res)
  t.is(res.sent[0].code, 5001)

  res = makeRes()
  routes['/v2/hash_rate/history'](makeReq({ currency: CURRENCY, mining_user_name: 'u1', start_time: nowSec }, {}), res)
  t.is(res.sent[0].code, 5001)
})

test('hash_rate/history returns generated list and B001 on state error', (t) => {
  const routes = makeRoutes()
  const nowSec = Math.floor(Date.now() / 1000)
  const body = { currency: CURRENCY, mining_user_name: 'u1', start_time: nowSec - 3600, end_time: nowSec }
  let res = makeRes()
  routes['/v2/hash_rate/history'](makeReq(body, {}), res)
  t.ok(Array.isArray(res.sent[0].hash_rate_list))
  t.ok(res.sent[0].hash_rate_list.length > 0)

  res = makeRes()
  routes['/v2/hash_rate/history'](makeReq(body, undefined), res)
  t.is(res.sent[0].code, 'B001')
})

test('worker/list returns workers and B001 on state error', (t) => {
  const routes = makeRoutes()
  let res = makeRes()
  routes['/v2/hash_rate/worker/list'](makeReq({ currency: CURRENCY, mining_user_name: 'u1' }, { workers_list: [{ host: 'h' }] }), res)
  t.is(res.sent[0].workers.length, 1)

  res = makeRes()
  routes['/v2/hash_rate/worker/list'](makeReq({ currency: CURRENCY, mining_user_name: 'u1' }, undefined), res)
  t.is(res.sent[0].code, 'B001')
})

test('mock worker route adds worker and reports errors', (t) => {
  const routes = makeRoutes()
  const state = { workers_list: [] }
  let res = makeRes()
  routes['/mock/minerpool/worker'](makeReq({ name: 'u1.w1', host: '10.0.0.1' }, state), res)
  t.is(res.sent[0].success, true)
  t.is(state.workers_list[0].hash_rate_info.name, 'w1')

  res = makeRes()
  routes['/mock/minerpool/worker'](makeReq({ host: '10.0.0.1' }, state), res)
  t.is(res.sent[0].success, false)
  t.is(res.sent[0].error, 'ERR_INVALID_NAME')
})

test('transactions/list returns range and error object on state error', (t) => {
  const routes = makeRoutes()
  const nowSec = Math.floor(Date.now() / 1000)
  const body = { currency: CURRENCY, mining_user_name: 'u1', start_time: nowSec - 3600, end_time: nowSec }
  let res = makeRes()
  routes['/v2/assets/transactions/list'](makeReq(body, { transactions_list: {} }), res)
  t.ok(Array.isArray(res.sent[0].transactions))

  res = makeRes()
  routes['/v2/assets/transactions/list'](makeReq(body, undefined), res)
  t.ok(res.sent[0].error)
})
