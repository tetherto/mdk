'use strict'

// Real-process repro for out-of-process DHT topic discovery.
//
// Spawns a real Kernel process and a real worker process that share ONLY a
// Hyperswarm topic — no bootstrap, no key-handoff file, no in-process handle —
// and asserts the Kernel registers the worker READY within 30s. This is the path
// start.js never exercises (it registers workers directly).
//
// Run it ~10x to gauge reliability:
//   for i in $(seq 1 10); do npx brittle tests/integration/dht-topic-discovery.test.js || echo "FAIL $i"; done

const test = require('brittle')
const os = require('os')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { spawn } = require('child_process')
const createTestnet = require('hyperdht/testnet')

const FIXTURES = path.join(__dirname, '..', 'fixtures')

function spawnFixture (name, topic, storeDir, extraArgs = []) {
  const child = spawn('node', [path.join(FIXTURES, name), '--topic', topic, '--store', storeDir, ...extraArgs], {
    stdio: ['ignore', 'pipe', 'pipe']
  })
  child._out = ''
  child.stdout.on('data', (d) => { child._out += d.toString() })
  child.stderr.on('data', (d) => { child._out += d.toString() })
  return child
}

function waitFor (child, token, timeoutMs) {
  return new Promise((resolve) => {
    const start = Date.now()
    const timer = setInterval(() => {
      const hit = child._out.includes(token)
      if (!hit && Date.now() - start <= timeoutMs) return
      clearInterval(timer)
      resolve(hit)
    }, 200)
    timer.unref()
  })
}

test('dht topic discovery - separately-spawned kernel + worker register over shared topic (no key handoff)', { timeout: 60000 }, async (t) => {
  const topic = crypto.randomBytes(32).toString('hex')
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-dht-repro-'))
  const orkStore = path.join(root, 'kernel')
  const workerStore = path.join(root, 'worker')

  // What this reproduces is two *separate processes* meeting through the topic
  // with no key handoff. Which DHT carries them is incidental, so run it on a
  // loopback testnet rather than the public network: the children reach it over
  // loopback, and the test no longer needs outbound UDP.
  const testnet = await createTestnet(3, t.teardown)
  const bootstrap = ['--bootstrap', testnet.bootstrap.map((n) => `${n.host}:${n.port}`).join(',')]

  // Kernel joins first (client querying); worker joins after (server announcing),
  // so the Kernel connects during the worker's join window — the failure timing.
  const kernel = spawnFixture('repro-kernel.js', topic, orkStore, bootstrap)
  t.teardown(() => new Promise((resolve) => {
    let pending = 2
    const done = () => {
      if (--pending > 0) return
      try { fs.rmSync(root, { recursive: true, force: true }) } catch {}
      resolve()
    }
    for (const c of [kernel, worker]) {
      if (c.exitCode !== null) done()
      else { c.once('exit', done); c.kill('SIGTERM') }
    }
  }))

  const started = await waitFor(kernel, 'REPRO_KERNEL_STARTED', 15000)
  t.ok(started, 'Kernel process started')

  const clientKey = (kernel._out.match(/REPRO_KERNEL_STARTED client=([0-9a-f]{64})/) || [])[1]
  t.ok(clientKey, 'Kernel published its client key')
  const worker = spawnFixture('repro-worker.js', topic, workerStore, ['--allow', clientKey, ...bootstrap])
  const workerReady = await waitFor(worker, 'REPRO_WORKER_READY', 15000)
  t.ok(workerReady, 'worker process announced on the topic')

  const registered = await waitFor(kernel, 'REPRO_KERNEL_REGISTERED', 30000)
  if (!registered) {
    t.comment('Kernel output:\n' + kernel._out)
    t.comment('worker output:\n' + worker._out)
  }
  t.ok(registered, 'Kernel registered the worker READY within 30s over the shared topic')
})
