'use strict'

const test = require('brittle')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const http = require('node:http')
const createTestnet = require('hyperdht/testnet')
const HyperswarmRPC = require('@hyperswarm/rpc')
const { createServer } = require('../../mock/server')
const keys = require('../../mock/lib/test-keys')
const { startEmcdWorker, EMCD_POOL } = require('../..')
const { ACTIONS, MESSAGE_TYPES } = require('../../../../../core/kernel/lib/protocol/actions')
const { build, serialize, deserialize } = require('../../../../../core/kernel/lib/protocol/envelope')
const { previousDay } = require('../../lib/utils')

for (const balanceStatus of [200, 403, 404]) {
  test(`worker serves telemetry over HRPC with /balance ${balanceStatus}`, { timeout: 60000 }, async t => {
    const testnet = await createTestnet(3, t.teardown)
    const mock = await createServer({ port: 0, balanceStatus, clockOffsetMs: 120000 })
    t.teardown(() => mock.app.close())
    const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-emcd-test-'))
    t.teardown(() => fs.rmSync(storeDir, { recursive: true, force: true }))
    const worker = await startEmcdWorker({
      workerId: 'emcd-test',
      rack: 'test',
      storeDir,
      root: storeDir,
      bootstrap: testnet.bootstrap,
      conf: { emcd: { ...keys, apiUrl: mock.apiUrl } }
    })
    t.teardown(() => worker.stop())
    worker.pool._logErr = () => {}
    const rpc = new HyperswarmRPC({ bootstrap: testnet.bootstrap })
    t.teardown(() => rpc.destroy())
    const send = async query => {
      const envelope = build({
        type: MESSAGE_TYPES.REQUEST,
        sender: 'kernel:kernel:test',
        action: ACTIONS.TELEMETRY_PULL,
        deviceId: 'emcd-test',
        payload: { query }
      })
      return deserialize(await rpc.request(worker.runtime.getPublicKey(), 'mdk', serialize(envelope)))
    }
    const initial = await send({ type: 'metrics' })
    t.ok(initial.payload.metrics.hashrate.error.includes('E_POOL_API'), 'no fabricated startup zeros')
    const now = new Date()
    await worker.pool.fetchWorkers(now)
    await worker.pool.fetchStats(now)
    await worker.pool.fetchTransactions(now)
    const response = await send({ type: 'metrics' })
    t.is(response.payload.metrics.hashrate, 150e12)
    t.is(response.payload.metrics.workers_online, 1)
    t.is(response.payload.metrics.estimated_earnings, 0.00012)
    if (balanceStatus === 200) {
      t.is(response.payload.metrics.balance, 0.00125)
    } else {
      t.ok(response.payload.metrics.balance.error.includes('E_POOL_API'))
    }
    const workers = await worker.pool.getWorkers({})
    t.is(workers.workers.length, 2)
    t.is(workers.workers[0].poolType, 'emcd')
    const { start, end } = previousDay(now)
    const transactions = await worker.pool.getWrkExtData({ query: { key: 'transactions', start, end } })
    t.is(transactions[0].transactions[0].changed_balance, 0.0001)
    t.is(worker.pool.data.statsData.stats[0].yearlyBalances.length, 12)
  })
}

test('stopping the pool aborts an in-flight HTTP request and removes signal listeners', async t => {
  let received
  const requestReceived = new Promise(resolve => {
    received = resolve
  })
  const server = http.createServer(() => received())
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.teardown(() => new Promise(resolve => {
    server.closeAllConnections(); server.close(resolve)
  }))
  const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-emcd-stop-'))
  t.teardown(() => fs.rmSync(storeDir, { recursive: true, force: true }))
  const before = process.listenerCount('SIGTERM')
  const pool = new EMCD_POOL({ emcd: { ...keys, apiUrl: `http://127.0.0.1:${server.address().port}/pool/v1` } }, { rack: 'test', root: storeDir, storeDir })
  await pool.init()
  t.teardown(() => new Promise(resolve => pool.stop(resolve)))
  t.is(process.listenerCount('SIGTERM'), before + 1)
  const pending = pool.fetchStats(new Date())
  const rejected = t.exception(pending, /abort/i)
  await requestReceived
  await new Promise(resolve => pool.stop(resolve))
  await rejected
  t.is(process.listenerCount('SIGTERM'), before)
  await t.exception(pool.fetchStats(new Date()), /abort/i)
})

test('invalid configuration fails before opening a persistent store', async t => {
  const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-emcd-invalid-'))
  t.teardown(() => fs.rmSync(storeDir, { recursive: true, force: true }))
  for (const config of [{}, { ...keys, accounts: ['same', 'same'] }, { ...keys, coin: 'ltc' }]) {
    const pool = new EMCD_POOL({ emcd: config }, { rack: 'test', root: storeDir, storeDir })
    await t.exception(pool.init(), /ERR_EMCD_/)
    t.is(pool.store_s1, undefined)
  }
})
