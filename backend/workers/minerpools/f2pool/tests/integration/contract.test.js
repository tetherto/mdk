'use strict'

// The API client sleeps a second between calls outside tests (F2Pool's rate limit).
process.env.NODE_ENV = 'test'

const test = require('brittle')
const path = require('path')
const { loadContract, createInstance } = require('@tetherto/mdk-worker')
const { createServer } = require('../../mock/server')
const { convertMsToSeconds } = require('../../lib/utils')

const PKG_DIR = path.join(__dirname, '..', '..')

async function startMock (t, usernames = 'testuser') {
  const mock = createServer({ host: '127.0.0.1', port: 0, usernames, delay: 0 })
  await mock.ready
  t.teardown(() => mock.exit())
  return { mock, apiUrl: `http://127.0.0.1:${mock.app.server.address().port}` }
}

function instanceFor (id, opts, env = { F2POOL_API_SECRET: 'secret-key' }, config = {}) {
  const { dir, entries } = loadContract(PKG_DIR)
  return createInstance({ dir, entries, device: { id, opts, env, config, workerId: 'f2pool-test' } })
}

test('contract loads from the package root with every declared handler', (t) => {
  const { contract, entries, publishedContract } = loadContract(PKG_DIR)
  t.is(contract.metadata.provider, 'f2pool')
  t.is(entries.telemetry.size, 5)
  t.is(entries.commands.size, 0)
  for (const entry of publishedContract.capabilities.telemetry) {
    t.is(entry.handler, undefined, `${entry.name} handler path stripped from published contract`)
  }
})

test('device load validates accounts and the API secret', (t) => {
  t.exception(() => instanceFor('x', { apiUrl: 'http://127.0.0.1:1' }), /ERR_ACCOUNTS_REQUIRED/)
  t.exception(() => instanceFor('x', { accounts: ['a'], apiUrl: 'http://127.0.0.1:1' }, {}), /ERR_API_SECRET_REQUIRED/)
})

test('telemetry channels read the mock pool', async (t) => {
  const { apiUrl } = await startMock(t)
  const instance = instanceFor('f2pool', { accounts: ['testuser'], apiUrl })

  const hashrate = await instance.telemetry.get('hashrate')({})
  t.ok(typeof hashrate === 'number' && hashrate > 0, `hashrate ${hashrate}`)
  const workers = await instance.telemetry.get('workers_online')({})
  t.ok(workers > 0, `workers_online ${workers}`)
  const balance = await instance.telemetry.get('balance')({})
  t.ok(typeof balance === 'number' && balance > 0, `balance ${balance}`)
  const earnings = await instance.telemetry.get('estimated_earnings')({})
  t.ok(typeof earnings === 'number', `estimated_earnings ${earnings}`)
})

test('the API secret from opts is a fallback for the env', async (t) => {
  const { apiUrl } = await startMock(t)
  const instance = instanceFor('f2pool', { accounts: ['testuser'], apiUrl, apiSecret: 'secret-key' }, {})
  t.ok(await instance.telemetry.get('balance')({}) > 0)
})

test('a wrong secret and an unreachable pool fail with ERR_POOL_API', async (t) => {
  const { mock, apiUrl } = await startMock(t)
  const wrong = instanceFor('f2pool', { accounts: ['testuser'], apiUrl }, { F2POOL_API_SECRET: 'nope' })
  await t.exception(wrong.telemetry.get('balance')({}), /ERR_POOL_API/)

  mock.exit()
  const down = instanceFor('f2pool', { accounts: ['testuser'], apiUrl })
  await t.exception(down.telemetry.get('hashrate')({}), /ERR_POOL_API/)
})

test('transactions fetches the requested range in one call per account', async (t) => {
  const { mock, apiUrl } = await startMock(t)
  const instance = instanceFor('f2pool', { accounts: ['testuser'], apiUrl })
  const transactions = instance.telemetry.get('transactions')

  const end = Date.now()
  const start = end - 3 * 24 * 60 * 60 * 1000
  const rows = await transactions({ start, end })
  t.ok(Array.isArray(rows) && rows.length >= 3, `${rows.length} rows over 3 days`)
  t.ok(rows.every((r) => r.username === 'testuser' && r.ts >= start && r.ts <= end && typeof r.changed_balance === 'number'))
  t.ok(rows.every((r, i) => i === 0 || r.ts >= rows[i - 1].ts), 'sorted by ts')

  // a sweep (no range) reads from UTC midnight, then only what is new
  const utcMidnight = Date.now() - (Date.now() % 86400000)
  const sweep1 = await transactions({})
  t.ok(Array.isArray(sweep1) && sweep1.length >= 1, 'the first sweep reads the current day')
  t.ok(sweep1.every((row) => row.ts >= utcMidnight), 'the first sweep starts at UTC midnight')
  const sweep2 = await transactions({})
  t.is(sweep2.length, 0, 'the next sweep reads nothing that was already stored')

  const hourly = await transactions({ start, end, aggrHourly: true })
  t.ok(Array.isArray(hourly) && hourly.length >= 72, `${hourly.length} hourly rows`)
  // The mock now and then adds a same-timestamp row on a request, so the total
  // comes from what the hourly request itself saw, not from the earlier fetch.
  const total = Object.values(mock.state.transactions_list)
    .filter((tx) => tx.created_at >= convertMsToSeconds(start) && tx.created_at <= convertMsToSeconds(end))
    .reduce((sum, tx) => sum + tx.changed_balance, 0)
  const spread = hourly.reduce((sum, h) => sum + h.revenue, 0)
  t.ok(Math.abs(total - spread) < 1e-9, 'hourly revenue sums to the range total')

  await t.exception(transactions({ start }), /ERR_END_INVALID/)
  await t.exception(transactions({ end }), /ERR_START_INVALID/)
  await t.exception(transactions({ start: end, end: start }), /ERR_RANGE_INVALID/)
  await t.exception(transactions({ start: 'x', end }), /ERR_RANGE_INVALID/)
})

test('a port without apiUrl targets the local mock, the way mdk run wires mock: true', async (t) => {
  const mock = createServer({ host: '127.0.0.1', port: 0, accounts: ['testuser'], delay: 0 })
  await mock.ready
  t.teardown(() => mock.exit())
  const port = mock.app.server.address().port
  const instance = instanceFor('f2pool', { accounts: ['testuser'], port })
  t.ok(await instance.telemetry.get('balance')({}) > 0)
})
