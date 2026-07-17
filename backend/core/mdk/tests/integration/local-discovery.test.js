'use strict'

// Local discovery mode (discovery: { mode: 'local' }): getKernel watches a shared
// keys dir and a runtime-hosted worker publishes its RPC key there, so the worker
// registers to READY by key — no Hyperswarm topic rendezvous. Connect-by-key
// still rides hyperdht (the same path the full-site e2e exercises).

const test = require('brittle')
const os = require('os')
const fs = require('fs')
const path = require('path')
const sdk = require('../..')
const { keysDir, publishWorkerKey } = require('../../lib/local-discovery')
const WorkerRuntime = require('../../../mdk-worker/lib/worker-runtime')
const simPlugin = require('../../../mdk-worker/tests/fixtures/sim-plugin')

test('local discovery - getKernel + a runtime worker register to READY via the shared dir', { timeout: 60000 }, async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-local-'))

  const kernel = await sdk.getKernel({ root, discovery: { mode: 'local' } })
  t.teardown(async () => {
    for (const fn of kernel._cleanup) { try { await fn() } catch {} }
    try { await kernel.stop() } catch {}
    try { fs.rmSync(root, { recursive: true, force: true }) } catch {}
  })

  t.is(kernel.topic, undefined, 'no DHT topic resolved in local mode')

  const runtime = new WorkerRuntime(simPlugin, {
    workerId: 'test-miner-1',
    devices: [{ deviceId: 'd1', config: { hashrate: 100, power: 3000 } }]
  })
  await runtime.start()
  t.teardown(async () => {
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
