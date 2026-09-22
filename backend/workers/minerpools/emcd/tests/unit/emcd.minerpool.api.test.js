'use strict'

const test = require('brittle')
const { setTimeout: sleep } = require('node:timers/promises')
const EmcdMinerpoolApi = require('../../lib/emcd.minerpool.api')
const keys = require('../../mock/lib/test-keys')

function api (get, opts = {}) {
  return new EmcdMinerpoolApi({ get }, { ...keys, requestIntervalMs: 0, ...opts })
}

function success (data) {
  return { body: { code: 'success', data } }
}

test('signs GET requests, preserves the base path and scopes subaccounts', async t => {
  const calls = []
  const client = api(async (url, opts) => {
    calls.push({ url, opts }); return success({ items: [] })
  })
  await client.getWorkers('subaccount-1')
  const { url, opts } = calls[0]
  t.is(url, 'https://endpoint.emcd.io/pool/v1/hashrate/workers?coin=btc')
  t.is(opts.headers['X-API-Key'], keys.apiKey)
  t.is(opts.headers['X-Subaccount-ID'], 'subaccount-1')
  t.is(opts.headers['X-Signature'].length, 64)
  t.is(opts.body, undefined)
  t.is(opts.redirect, false, 'signed requests do not follow redirects')
  await client.getWorkers('')
  t.is(calls[1].opts.headers['X-Subaccount-ID'], undefined)
})

test('401 syncs server time once and signs the retry with the adjusted clock', async t => {
  const calls = []
  const serverEpoch = Math.floor(Date.now() / 1000) + 120
  const client = api(async (url, opts) => {
    calls.push({ url, opts })
    if (calls.length === 1) {
      throw Object.assign(new Error('private request headers'), { status: 401 })
    }
    if (url.endsWith('/time')) {
      return { body: { epoch: serverEpoch } }
    }
    return success({ balance: '1' })
  })
  t.alike(await client.getBalance('sub-1'), { balance: '1' })
  t.is(calls.length, 3)
  t.is(calls[1].opts.headers['X-API-Key'], undefined, '/time is public')
  t.ok(Math.abs(Number(calls[2].opts.headers['X-Timestamp']) - serverEpoch) <= 1)
  t.is(calls[2].opts.headers['X-Subaccount-ID'], 'sub-1')
})

test('repeated 401 fails once; errors never retain credentials or raw bodies', async t => {
  let calls = 0
  const client = api(async url => {
    calls++
    if (url.endsWith('/time')) {
      return { body: { epoch: Date.now() / 1000 } }
    }
    throw Object.assign(new Error(keys.apiSecret), { status: 401, response: { secret: keys.apiSecret } })
  })
  await t.exception(client.getBalance(''), /ERR_EMCD_AUTH/)
  t.is(calls, 3)
  const failed = api(async () => {
    throw Object.assign(new Error(keys.apiSecret), { status: 403 })
  })
  try {
    await failed.getBalance('')
    t.fail('expected error')
  } catch (err) {
    t.is(err.status, 403)
    t.absent(err.stack.includes(keys.apiSecret))
    t.is(err.response, undefined)
  }
})

test('clock-sync and retry failures preserve their status without another retry', async t => {
  for (const failureAt of [2, 3]) {
    let calls = 0
    const client = api(async () => {
      calls++
      if (calls === 1) {
        throw Object.assign(new Error('unauthorized'), { status: 401 })
      }
      if (calls === failureAt) {
        throw Object.assign(new Error('unavailable'), { status: 503 })
      }
      return { body: { epoch: Date.now() / 1000 } }
    })
    const path = failureAt === 2 ? '/time' : '/balance'
    await t.exception(client.getBalance(''), new RegExp(`ERR_EMCD_API ${path} 503`))
    t.is(calls, failureAt)
  }
})

test('rejects API envelopes and malformed data instead of returning empty results', async t => {
  for (const body of [null, {}, { code: 'error', data: [] }, { code: 'success' }]) {
    await t.exception(api(async () => ({ body })).getBalance(''), /INVALID_RESPONSE/)
  }
  await t.exception(api(async () => success({})).getWorkers(''), /INVALID_WORKERS/)
  await t.exception(api(async () => success({ items: [], page: 0 })).getPayouts('', '2026-01-01', '2026-01-01'), /INVALID_PAGE/)
})

test('a page that does not echo the request is rejected instead of being summed twice', async t => {
  const repeated = api(async () => success({ items: [{ amount: 1 }], page: 1, pageSize: 100, totalSize: 150 }))
  await t.exception(repeated.getPayouts('', '2026-01-01', '2026-01-01'), /INVALID_PAGE/)
  const capped = api(async url => {
    const page = Number(new URL(url).searchParams.get('page'))
    return success({ items: [{ amount: 1 }], page, pageSize: 50, totalSize: 150 })
  })
  await t.exception(capped.getPayouts('', '2026-01-01', '2026-01-01'), /INVALID_PAGE/)
})

test('drains ledger pages even when earnings are grouped into fewer rows', async t => {
  const pages = []
  const client = api(async url => {
    const page = Number(new URL(url).searchParams.get('page'))
    pages.push(page)
    return success({ items: [{ date: '2026-09-21', totalAmount: page }], page, pageSize: 100, totalSize: 201 })
  })
  const rows = await client.getEarnings('', '2026-09-21', '2026-09-21')
  t.alike(pages, [1, 2, 3])
  t.is(rows.reduce((sum, row) => sum + row.totalAmount, 0), 6)
  const incomplete = api(async () => success({ items: [], page: 1, pageSize: 100, totalSize: 101 }))
  await t.exception(incomplete.getEarnings('', '2026-09-21', '2026-09-21'), /INCOMPLETE_PAGE/)
  const missing = api(async () => success({ items: [], page: 1, pageSize: 100, totalSize: 1 }))
  await t.exception(missing.getPayouts('', '2026-09-21', '2026-09-21'), /INCOMPLETE_PAGE/)
})

test('concurrent requests are spaced and a failure does not poison the queue', async t => {
  const times = []
  const client = api(async () => {
    times.push(Date.now())
    if (times.length === 1) {
      throw Object.assign(new Error('rate limited'), { status: 429 })
    }
    return success({})
  }, { requestIntervalMs: 30 })
  const results = await Promise.allSettled([client.getBalance('a'), client.getBalance('b'), client.getBalance('c')])
  t.alike(results.map(r => r.status), ['rejected', 'fulfilled', 'fulfilled'])
  t.ok(times[1] - times[0] >= 25)
  t.ok(times[2] - times[1] >= 25)
})

test('abort cancels a rate-limit wait and prevents queued HTTP calls', async t => {
  const controller = new AbortController()
  let calls = 0
  const client = api(async () => {
    calls++; return success({})
  }, { signal: controller.signal, requestIntervalMs: 10000 })
  await client.getBalance('')
  const pending = client.getBalance('')
  const queued = client.getBalance('')
  await sleep(10)
  controller.abort()
  await t.exception(pending, /abort/i)
  await t.exception(queued, /abort/i)
  t.is(calls, 1)
})

test('validates credentials, coin and URL', t => {
  t.exception(() => api(() => {}, { apiKey: '' }), /API_KEY_REQUIRED/)
  t.exception(() => api(() => {}, { apiSecret: '' }), /API_SECRET_REQUIRED/)
  t.exception(() => api(() => {}, { coin: 'ltc' }), /COIN_UNSUPPORTED/)
  t.exception(() => api(() => {}, { apiUrl: 'https://user:password@example.com' }), /API_URL_INVALID/)
})
