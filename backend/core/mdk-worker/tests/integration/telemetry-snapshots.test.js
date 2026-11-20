'use strict'

const test = require('brittle')
const crypto = require('crypto')
const fs = require('fs')
const os = require('os')
const path = require('path')
const createTestnet = require('hyperdht/testnet')
const DHT = require('hyperdht')
const { createKernel } = require('../../../kernel')
const { grantTestAdmin } = require('../../../kernel/lib/testing')
const { createMdkClient } = require('../../../client')
const { WorkerRuntime } = require('../..')
const polling = require('../fixtures/sim-plugin-polling')

const LOOPBACK = '127.0.0.1'

const WORKER_ID = 'poll-rack-1'
const DEVICES = [
  { deviceId: 'SIM-001', config: { hashrate: 100, power: 3000 } },
  { deviceId: 'SIM-002', config: { hashrate: 140, power: 3200, status: 'sleeping' } }
]

function createTmpDir (t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-worker-e2e-'))
  fs.mkdirSync(path.join(dir, 'config'), { recursive: true })
  fs.mkdirSync(path.join(dir, 'store'), { recursive: true })
  t.teardown(() => fs.rmSync(dir, { recursive: true, force: true }), { order: 1 })
  return dir
}

async function until (check, label, attempts = 100) {
  for (let i = 0; i < attempts; i++) {
    if (await check()) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`ERR_TEST_TIMEOUT: ${label}`)
}

// Worker Runtime polling the sim plugin, a Kernel that admits it, and an
// mdk-client signed in as an admin service account — the production shape.
async function setup (t) {
  const testnet = await createTestnet(4, t.teardown)
  const { bootstrap } = testnet
  const topic = crypto.randomBytes(32).toString('hex')
  const tmpDir = createTmpDir(t)
  polling._reset()

  const runtime = new WorkerRuntime(polling, {
    workerId: WORKER_ID,
    kernelTopic: topic,
    bootstrap,
    dhtHost: LOOPBACK,
    allowAll: true,
    devices: DEVICES,
    telemetryStoreDir: path.join(tmpDir, 'telemetry'),
    config: { telemetryPollIntervalMs: 50 }
  })
  await runtime.start()
  t.teardown(() => runtime.stop())

  const kernel = createKernel({
    db: path.join(tmpDir, 'store'),
    root: tmpDir,
    listeners: { hrpc: { bootstrap, dhtHost: LOOPBACK } },
    discovery: { topic, workerKeys: [runtime.getPublicKey().toString('hex')] },
    cadences: { telemetryPullMs: 60000, healthPingMs: 60000, statePullMs: 60000 }
  })
  await kernel.init()
  await kernel.start()
  t.teardown(() => kernel.stop())
  await until(() => kernel.registry.listWorkers().some((w) => w.state === 'READY'), 'worker READY', 300)

  const keyPair = DHT.keyPair()
  kernel.allowKey(keyPair.publicKey)
  const credential = await grantTestAdmin(kernel)
  const client = createMdkClient({
    kernelKey: kernel.getPublicKey().toString('hex'),
    kernelKeyPair: () => keyPair,
    kernelBootstrap: bootstrap,
    kernelDhtHost: LOOPBACK,
    kernelCredential: credential
  })
  t.teardown(() => client.close(), { order: -1 })

  await until(() => DEVICES.every((d) => (polling._calls.stats[d.deviceId] || 0) >= 1), 'first sweep')
  return { runtime, kernel, client }
}

test('a fleet snapshot and an aggregate come from the worker store with no device call', { timeout: 120000 }, async (t) => {
  const { runtime, client } = await setup(t)
  await runtime._telemetry.poller.stop()
  const callsBefore = JSON.stringify(polling._calls)

  const snap = await client.pullSnapshot({ workers: [WORKER_ID], metrics: ['hashrate_rt', 'power'] })
  t.alike(Object.keys(snap.devices).sort(), ['SIM-001', 'SIM-002'])
  t.alike(snap.devices['SIM-001'].metrics, { hashrate_rt: { value: 100 }, power: { value: 3000 } })
  t.alike(snap.devices['SIM-002'].metrics, { hashrate_rt: { value: 140 }, power: { value: 3200 } })
  t.is(snap.snapshotTs, Math.max(snap.devices['SIM-001'].ts, snap.devices['SIM-002'].ts))
  t.is(snap.errors, undefined)

  const agg = await client.pullAggregate({
    workers: [WORKER_ID],
    ops: {
      hashrate_total: { op: 'sum', src: 'metrics.hashrate_rt' },
      hashrate_avg: { op: 'avg', src: 'metrics.hashrate_rt' },
      mining: { op: 'cnt', filter: { src: 'metrics.status', eq: 'mining' } },
      by_status: { op: 'group_sum', src: 'metrics.power', group: 'metrics.status' }
    }
  })
  t.alike(agg.ops, { hashrate_total: 240, hashrate_avg: 120, mining: 1, by_status: { mining: 3000, sleeping: 3200 } })
  t.is(agg.deviceCount, 2)

  t.is(JSON.stringify(polling._calls), callsBefore, 'neither read touched a device')

  const partial = await client.pullSnapshot({ workers: [WORKER_ID, 'ghost-rack'] })
  t.alike(Object.keys(partial.devices).sort(), ['SIM-001', 'SIM-002'])
  t.alike(partial.errors, { 'ghost-rack': 'ERR_WORKER_NOT_FOUND' })

  const refused = await client.pullAggregate({ workers: [WORKER_ID], ops: { x: { op: 'avg', src: 'metrics.status' } } })
  t.alike(refused.errors, { [WORKER_ID]: 'ERR_AGGREGATE_OP_TYPE: x: avg on string metrics.status' })

  const one = await client.pullTelemetry('SIM-002', { type: 'snapshot', metrics: ['power'] })
  t.alike(one.devices, { 'SIM-002': { ts: snap.devices['SIM-002'].ts, metrics: { power: { value: 3200 } } } })
  t.is(JSON.stringify(polling._calls), callsBefore)

  const live = await client.pullTelemetry('SIM-001', 'metrics')
  t.is(live.metrics.hashrate_rt, 100, 'the live metrics read still reaches the device')
  t.not(JSON.stringify(polling._calls), callsBefore)
})
