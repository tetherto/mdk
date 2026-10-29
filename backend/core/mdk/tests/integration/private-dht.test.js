'use strict'

// Local / air-gapped profile: a private HyperDHT bootstrap on 127.0.0.1
// (startDhtBootstrap) and every component started with that list as its
// `bootstrap` and `dhtHost: '127.0.0.1'`. Both discovery modes must reach
// READY and the HRPC path must answer, with every DHT node bound to loopback
// and none of them knowing a public *.hyperdht.org node.

const test = require('brittle')
const os = require('os')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const sdk = require('../..')
const { startDhtBootstrap } = require('../../lib/dht-bootstrap')
const { keysDir, publishWorkerKey, trustKernel } = require('../../lib/local-discovery')
const WorkerRuntime = require('../../../mdk-worker/lib/worker-runtime')
const simPlugin = require('../../../mdk-worker/tests/fixtures/sim-plugin')

const LOOPBACK = '127.0.0.1'

function assertPrivateNode (t, dht, label) {
  t.is(dht.io.serverSocket.address().host, LOOPBACK, `${label}: DHT socket bound to loopback`)
  const known = dht.toArray().map((n) => n.host)
  t.ok(known.every((h) => h === LOOPBACK), `${label}: routing table holds loopback nodes only (${[...new Set(known)].join(', ') || 'none'})`)
}

async function privateBootstrap (t) {
  // Port 0 is not accepted by the bootstrapper; pick a free high port.
  const port = 40000 + crypto.randomInt(20000)
  const net = await startDhtBootstrap({ host: LOOPBACK, port })
  t.teardown(() => net.close(), { order: Infinity })
  return net
}

async function bootKernel (t, opts) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-private-dht-'))
  const kernel = await sdk.getKernel({ root, keyFile: false, trustedKeysDir: false, ...opts(root) })
  t.teardown(async () => {
    for (const fn of kernel._cleanup) { try { await fn() } catch {} }
    try { await kernel.stop() } catch {}
    try { fs.rmSync(root, { recursive: true, force: true }) } catch {}
  })
  return { kernel, root }
}

async function bootWorker (t, kernel, dht, extra = {}) {
  const runtime = new WorkerRuntime(simPlugin, {
    workerId: 'private-miner-1',
    devices: [{ deviceId: 'd1', config: { hashrate: 100, power: 3000 } }],
    ...dht,
    ...extra
  })
  trustKernel(runtime, kernel)
  await runtime.start()
  t.teardown(async () => { try { await runtime.stop() } catch {} })
  return runtime
}

test('private DHT - topic discovery on a loopback-only bootstrap', { timeout: 90000 }, async (t) => {
  const { bootstrap } = await privateBootstrap(t)
  const dht = { bootstrap, dhtHost: LOOPBACK }
  const topic = crypto.randomBytes(32).toString('hex')

  const { kernel } = await bootKernel(t, () => ({
    topic,
    hrpc: dht,
    discovery: { mode: 'dht', allowAnyWorker: true }
  }))
  const runtime = await bootWorker(t, kernel, dht, { kernelTopic: topic })

  const workers = await sdk.waitForDiscovery(kernel, 60000)
  t.is(workers.filter((w) => w.state === 'READY').length, 1, 'worker reached READY over the private topic')

  assertPrivateNode(t, kernel.hrpcListener.getDht(), 'kernel')
  assertPrivateNode(t, runtime._dht, 'worker')
})

test('private DHT - local discovery still rides the private DHT for HRPC', { timeout: 90000 }, async (t) => {
  const { bootstrap } = await privateBootstrap(t)
  const dht = { bootstrap, dhtHost: LOOPBACK }

  const { kernel, root } = await bootKernel(t, () => ({ hrpc: dht, discovery: { mode: 'local' } }))
  const runtime = await bootWorker(t, kernel, dht)
  publishWorkerKey(keysDir(root), 'private-miner-1', runtime.getPublicKey().toString('hex'))

  const workers = await sdk.waitForDiscovery(kernel, 60000)
  t.is(workers.filter((w) => w.state === 'READY').length, 1, 'worker reached READY by key over HRPC')

  assertPrivateNode(t, kernel.hrpcListener.getDht(), 'kernel')
  assertPrivateNode(t, runtime._dht, 'worker')
})

test('private DHT - same process: registerWorker still dials over the private DHT', { timeout: 90000 }, async (t) => {
  const { bootstrap } = await privateBootstrap(t)
  const dht = { bootstrap, dhtHost: LOOPBACK }

  const { kernel } = await bootKernel(t, () => ({ hrpc: dht, discovery: { mode: 'local' } }))
  const runtime = await bootWorker(t, kernel, dht)
  await kernel.registerWorker(runtime.getPublicKey())

  const workers = await sdk.waitForDiscovery(kernel, 60000)
  t.is(workers.filter((w) => w.state === 'READY').length, 1, 'in-process worker reached READY')
  assertPrivateNode(t, kernel.hrpcListener.getDht(), 'kernel')
})

test('private DHT - the gateway net facility joins the private network too', { timeout: 90000 }, async (t) => {
  const { bootstrap } = await privateBootstrap(t)
  const dht = { bootstrap, dhtHost: LOOPBACK }

  const { kernel, root } = await bootKernel(t, () => ({ hrpc: dht, discovery: { mode: 'local' } }))
  const hnd = await sdk.startGateway({
    kernel,
    root: path.join(root, 'gateway'),
    port: 0,
    env: 'test',
    trustedKeysDir: false,
    ...dht
  })
  t.teardown(() => new Promise((resolve) => hnd.stop(resolve)), { order: -1 })

  await hnd.net_r0.dht.fullyBootstrapped()
  assertPrivateNode(t, hnd.net_r0.dht, 'gateway net facility')
})
