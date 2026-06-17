'use strict'

// Local discovery mode (discovery: { mode: 'local' }): getOrk watches a shared
// keys dir and startWorker publishes its RPC key there, so the worker registers
// to READY by key — no Hyperswarm topic rendezvous. Connect-by-key still rides
// hyperdht (the same path the full-site e2e exercises).

const test = require('brittle')
const os = require('os')
const fs = require('fs')
const path = require('path')
const sdk = require('../..')

const contract = {
  metadata: { provider: 'test', deviceFamily: 'miner', brand: 'TestMiner', modelsSupported: ['T1'], overview: 'Test' },
  capabilities: {
    telemetry: [{ name: 'hashrate', type: 'number', unit: 'TH/s', description: 'test' }],
    commands: [{ name: 'reboot', params: [] }],
    health: { supportedStates: ['OK'] },
    errors: {}
  }
}

// Minimal ThingManager-shaped worker: one online device, no real hardware.
class TestMiner {
  constructor (conf, ctx) {
    this.ctx = ctx
    this.mem = { things: { d1: { id: 'd1', type: 'test', ctrl: { isThingOnline () { return true } } } } }
  }

  async init () {}
  getThingType () { return 'wrk-test-miner' }
  listThings () { return Object.values(this.mem.things).map(t => ({ id: t.id, type: t.type })) }
  async collectThingSnap () { return { hashrate: 1 } }
  stop (cb) { if (cb) cb() }
}

test('local discovery - getOrk + startWorker register a worker to READY via the shared dir', { timeout: 60000 }, async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-local-'))

  const ork = await sdk.getOrk({ root, ipc: false, discovery: { mode: 'local' } })
  t.teardown(async () => {
    for (const fn of ork._cleanup) { try { await fn() } catch {} }
    try { await ork.stop() } catch {}
    try { fs.rmSync(root, { recursive: true, force: true }) } catch {}
  })

  t.is(ork.topic, undefined, 'no DHT topic resolved in local mode')

  const { manager, adapter } = await sdk.startWorker(TestMiner, {
    root,
    workerId: 'test-miner-1',
    contract,
    discovery: { mode: 'local' }
  })
  t.teardown(async () => {
    try { await new Promise((resolve) => manager.stop(() => resolve())) } catch {}
    try { await adapter.stop() } catch {}
  })

  const keyFile = path.join(root, '.worker-keys', 'test-miner-1.key')
  t.ok(fs.existsSync(keyFile), 'worker published its RPC key to the shared keys dir')

  const workers = await sdk.waitForDiscovery(ork, 45000)
  const ready = workers.filter((w) => w.state === 'READY')
  t.is(ready.length, 1, 'worker reached READY')
  t.is(ready[0].workerId, 'test-miner-1', 'registered under the published workerId')
  t.is(ready[0].deviceIds.length, 1, 'device synced from identity')
})
