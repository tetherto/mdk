'use strict'

const test = require('brittle')
const crypto = require('crypto')
const http = require('http')
const { createServer } = require('../../mock/server')
const { TEST_ACCESS_KEY, TEST_PRIVATE_KEY } = require('../../mock/lib/test-keys')

let mockHandle
let baseUrl

function freePort () {
  return new Promise((resolve) => {
    const server = http.createServer()
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      server.close(() => resolve(port))
    })
  })
}

function signedBody (params) {
  const dataJson = JSON.stringify(params)
  const timestamp = Date.now()
  const signer = crypto.createSign('MD5')
  signer.update(`${dataJson}|${timestamp}`, 'utf8')
  return {
    dataJson,
    accessKey: TEST_ACCESS_KEY,
    timestamp,
    sign: signer.sign(TEST_PRIVATE_KEY, 'base64')
  }
}

async function post (path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })
  return res.json()
}

test('setup: start mock server', async (t) => {
  const port = await freePort()
  mockHandle = createServer({ port, host: '127.0.0.1', delay: 0 })
  await mockHandle.ready
  baseUrl = `http://127.0.0.1:${port}`
  t.pass(`mock on ${port}`)
})

test('rejects a missing or wrong accessKey', async (t) => {
  const body = signedBody({ coin: 'btc', subaccount: 'spider-test' })
  body.accessKey = 'wrong'
  const res = await post('/v2/subaccount/getSubaccountProfitInfo', body)
  t.is(res.code, 'AUTH_FAILED')
})

test('rejects an invalid signature', async (t) => {
  const body = signedBody({ coin: 'btc', subaccount: 'spider-test' })
  body.sign = Buffer.from('garbage').toString('base64')
  const res = await post('/v2/subaccount/getSubaccountProfitInfo', body)
  t.is(res.code, 'SIGN_INVALID')
})

test('rejects an unknown subaccount', async (t) => {
  const res = await post('/v2/subaccount/getSubaccountProfitInfo',
    signedBody({ coin: 'btc', subaccount: 'nobody' }))
  t.is(res.code, 'PERMISSION_DENIED')
})

test('serves profit info for a valid signed request', async (t) => {
  const res = await post('/v2/subaccount/getSubaccountProfitInfo',
    signedBody({ coin: 'btc', subaccount: 'spider-test' }))
  t.is(res.code, 'SUCCESS')
  t.is(typeof res.data.totalProfit, 'number')
  t.is(typeof res.data.unpaidProfit, 'number')
})

test('serves full hashrate', async (t) => {
  const res = await post('/v2/sp/hashrate/subaccount/fullHashRate',
    signedBody({ coin: 'btc', subaccount: 'spider-test' }))
  // the /v2/sp/* namespace answers 200, not "SUCCESS"
  t.is(res.code, 200)
  t.is(res.data.subaccount, 'spider-test')
  t.is(typeof res.data.hashRate10, 'string')
})

test('paginates the worker list', async (t) => {
  const page1 = await post('/v2/sp/hashrate/worker/list',
    signedBody({ coin: 'btc', subaccount: 'spider-test', pageNum: 1, pageSize: 4 }))
  t.is(page1.code, 200)
  t.is(page1.data.records.length, 4)
  t.is(page1.data.total, 11)
  t.is(page1.data.pages, 3)

  const page3 = await post('/v2/sp/hashrate/worker/list',
    signedBody({ coin: 'btc', subaccount: 'spider-test', pageNum: 3, pageSize: 4 }))
  t.is(page3.data.records.length, 3)
})

test('serves payment records within the requested range', async (t) => {
  const end = Date.now()
  const start = end - 3 * 24 * 60 * 60 * 1000
  const res = await post('/v2/subaccount/getSubaccountPaymentRecord',
    signedBody({ coin: 'btc', subaccount: 'spider-test', startTimestamp: start, endTimestamp: end, pageNumber: 1, pageSize: 100 }))
  t.is(res.code, 'SUCCESS')
  t.ok(res.data.list.length > 0)
  t.ok(res.data.list.every(p => p.paymentDate >= start && p.paymentDate <= end))
  t.ok(res.data.list.every(p => typeof p.txId === 'string'))
})

test('serves a cached hashrate chart', async (t) => {
  const end = Date.now()
  const start = end - 24 * 60 * 60 * 1000
  const body = signedBody({ coin: 'btc', subaccount: 'spider-test', startTimestamp: start, endTimestamp: end })
  const res1 = await post('/v2/sp/hashrate/subaccount/timeRangeHashRateChart', body)
  t.is(res1.code, 200)
  t.ok(res1.data.length >= 24)

  const res2 = await post('/v2/sp/hashrate/subaccount/timeRangeHashRateChart', body)
  t.alike(res2.data, res1.data, 'same range returns the cached chart')
})

test('mock control endpoint adds a worker without auth', async (t) => {
  const res = await post('/mock/minerpool/worker', { name: 'spider-test.added-1', host: '127.0.0.1' })
  t.is(res.success, true)

  const list = await post('/v2/sp/hashrate/worker/list',
    signedBody({ coin: 'btc', subaccount: 'spider-test', pageNum: 1, pageSize: 100 }))
  t.ok(list.data.records.some(w => w.workerName === 'added-1'))
})

test('teardown: close mock', async (t) => {
  if (mockHandle && mockHandle.app) {
    await mockHandle.app.close()
  }
  t.pass('cleaned up')
})
