'use strict'

// Local discovery mode (discovery: { mode: 'local' }): getKernel watches a shared
// keys dir and a runtime-hosted worker publishes its RPC key there, so the worker
// registers to READY by key — no Hyperswarm topic rendezvous. Connect-by-key
// still rides hyperdht (the same path the mvp-site example exercises).

const test = require('brittle')
const os = require('os')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const sdk = require('../..')
const { startDhtBootstrap } = require('../../lib/dht-bootstrap')
const { keysDir, publishWorkerKey, trustKeysFromDir, readTrustedKeys } = require('../../lib/local-discovery')
const WorkerRuntime = require('../../../mdk-worker/lib/worker-runtime')
const simPlugin = require('../../../mdk-worker/tests/fixtures/sim-plugin')

const LOOPBACK = '127.0.0.1'

// Connect-by-key rides hyperdht, which without a `bootstrap` falls back to its
// public nodes, so this test would dial node{1,2,3}.hyperdht.org. Run it on a
// loopback-only bootstrap instead, the way private-dht.test.js does.
async function privateDht (t) {
  // Port 0 is not accepted by the bootstrapper; pick a free high port.
  const net = await startDhtBootstrap({ host: LOOPBACK, port: 40000 + crypto.randomInt(20000) })
  t.teardown(() => net.close(), { order: Infinity })
  return { bootstrap: net.bootstrap, dhtHost: LOOPBACK }
}

test('local discovery - getKernel + a runtime worker register to READY via the shared dir', { timeout: 60000 }, async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-local-'))
  const dht = await privateDht(t)

  const kernel = await sdk.getKernel({ root, discovery: { mode: 'local' }, hrpc: dht })
  t.teardown(async () => {
    for (const fn of kernel._cleanup) { try { await fn() } catch {} }
    try { await kernel.stop() } catch {}
    try { fs.rmSync(root, { recursive: true, force: true }) } catch {}
  })

  t.is(kernel.topic, undefined, 'no DHT topic resolved in local mode')

  t.alike(readTrustedKeys(kernel.trustedKeysDir).map((k) => k.name), ['kernel'], 'kernel published its client key')

  // Out-of-process style: the worker learns who to admit from the trusted-keys dir.
  const runtime = new WorkerRuntime(simPlugin, {
    workerId: 'test-miner-1',
    devices: [{ deviceId: 'd1', config: { hashrate: 100, power: 3000 } }],
    ...dht
  })
  const trust = trustKeysFromDir(runtime, kernel.trustedKeysDir)
  t.alike(runtime.getAllowedKeys(), [kernel.getClientPublicKey().toString('hex')])
  await runtime.start()
  t.teardown(async () => {
    trust.stop()
    try { await runtime.stop() } catch {}
  })

  publishWorkerKey(keysDir(root), 'test-miner-1', runtime.getPublicKey().toString('hex'))

  const keyFile = path.join(root, '.worker-keys', 'test-miner-1.key')
  t.ok(fs.existsSync(keyFile), 'worker published its RPC key to the shared keys dir')

  const workers = await sdk.waitForDiscovery(kernel, 45000)
  const ready = workers.filter((w) => w.state === 'READY')
  t.is(ready.length, 1, 'worker reached READY')
  t.is(ready[0].workerId, 'test-miner-1', 'registered under the published workerId')
  t.is(ready[0].deviceIds.length, 1, 'device synced from identity')
})
