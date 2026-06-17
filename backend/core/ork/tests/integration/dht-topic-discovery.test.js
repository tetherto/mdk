'use strict'

// Real-process repro for out-of-process DHT topic discovery.
//
// Spawns a real ORK process and a real worker process that share ONLY a
// Hyperswarm topic — no bootstrap, no key-handoff file, no in-process handle —
// and asserts the ORK registers the worker READY within 30s. This is the path
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

const FIXTURES = path.join(__dirname, '..', 'fixtures')

function spawnFixture (name, topic, storeDir) {
  const child = spawn('node', [path.join(FIXTURES, name), '--topic', topic, '--store', storeDir], {
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

test('dht topic discovery - separately-spawned ork + worker register over shared topic (no bootstrap)', { timeout: 60000 }, async (t) => {
  const topic = crypto.randomBytes(32).toString('hex')
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-dht-repro-'))
  const orkStore = path.join(root, 'ork')
  const workerStore = path.join(root, 'worker')

  // ORK joins first (client querying); worker joins after (server announcing),
  // so the ORK connects during the worker's join window — the failure timing.
  const ork = spawnFixture('repro-ork.js', topic, orkStore)
  t.teardown(() => new Promise((resolve) => {
    let pending = 2
    const done = () => {
      if (--pending > 0) return
      try { fs.rmSync(root, { recursive: true, force: true }) } catch {}
      resolve()
    }
    for (const c of [ork, worker]) {
      if (c.exitCode !== null) done()
      else { c.once('exit', done); c.kill('SIGTERM') }
    }
  }))

  const started = await waitFor(ork, 'REPRO_ORK_STARTED', 15000)
  t.ok(started, 'ORK process started')

  const worker = spawnFixture('repro-worker.js', topic, workerStore)
  const workerReady = await waitFor(worker, 'REPRO_WORKER_READY', 15000)
  t.ok(workerReady, 'worker process announced on the topic')

  const registered = await waitFor(ork, 'REPRO_ORK_REGISTERED', 30000)
  if (!registered) {
    t.comment('ORK output:\n' + ork._out)
    t.comment('worker output:\n' + worker._out)
  }
  t.ok(registered, 'ORK registered the worker READY within 30s over the shared topic')
})
