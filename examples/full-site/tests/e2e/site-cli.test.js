'use strict'

// Scripted live e2e for the full-site CLI. Drives the dispatcher programmatically
// (the same code path `node cli.js` uses) against REAL spawned processes with
// --miners 3 for speed, and asserts real behaviour over HRPC + HTTP — not just
// PID liveness. Slow by nature (boots mocks + Kernel + 11 workers + gateway).

const test = require('brittle')
const os = require('os')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const SITE = path.join(__dirname, '..', '..')
const { ProcessManager } = require(path.join(SITE, 'cli', 'process-manager'))
const { createDispatcher } = require(path.join(SITE, 'cli', 'commands'))
const { fetchStatus } = require(path.join(SITE, 'backend', 'inspect'))

const HTTP = 3019
const PORTS = [HTTP, 5502, 5504, 5503, 5505, 5506, 5510, 5511, 5512, 8010, 8011, 10883, 14100, 14101, 14102, 14200, 14201, 14202, 14300, 14301, 14302, 14400, 14401, 14402]
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function portsHeld () {
  try { return execSync(`lsof -ti:${PORTS.join(',')} 2>/dev/null || true`).toString().trim() } catch { return '' }
}

test('site CLI e2e: up, status, overview, seed, logs, ps, down', { timeout: 240000 }, async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-e2e-'))
  const pm = new ProcessManager({ root, cwd: SITE })
  const out = []
  const ctx = { pm, root, siteDir: SITE, httpPort: HTTP, uiPort: 3042, print: (s) => out.push(s) }
  const { dispatch } = createDispatcher(ctx)

  t.teardown(async () => {
    try { await pm.stopAll() } catch {}
    await sleep(2500)
    try { fs.rmSync(root, { recursive: true, force: true }) } catch {}
  })

  await dispatch('up --miners 3 --no-ui')
  t.ok(out.some((l) => l.includes('Site up.')), 'up completed')

  const status = await fetchStatus(root)
  t.is(status.kernelKey.length, 64, 'Kernel key surfaced over HRPC')
  t.is(status.workers.length, 11, '11 workers registered')
  t.ok(status.workers.every((w) => w.state === 'READY'), 'all workers READY (queried over HRPC)')

  const overview = await (await fetch(`http://127.0.0.1:${HTTP}/site/overview`)).json()
  t.is(overview.miners.length, 9, '/site/overview reports 9 miners (3 per family)')
  t.is(overview.containers.length, 2, '/site/overview reports 2 containers')
  t.is(overview.pools.length, 2, '/site/overview reports 2 pools')
  t.is(overview.sensors.length, 2, '/site/overview reports 2 sensors')

  await dispatch('seed antminer')
  const overview2 = await (await fetch(`http://127.0.0.1:${HTTP}/site/overview`)).json()
  t.is(overview2.miners.length, 10, 'seeded antminer appears in /site/overview')

  out.length = 0
  await dispatch('logs kernel')
  t.ok(out.join('\n').includes('MDK_READY kernel'), 'logs kernel shows Kernel output')
  out.length = 0
  await dispatch('logs whatsminer-worker --grep MDK_READY')
  t.ok(out.join('\n').includes('worker:whatsminer'), 'logs --grep filters the worker log')

  const rows = pm.list()
  t.is(rows.length, 14, 'mocks + kernel + 11 workers + gateway tracked')
  t.ok(rows.every((r) => typeof r.pid === 'number' && r.pid > 0), 'every child has a pid')

  await dispatch('down')
  await sleep(2500)
  t.absent(portsHeld(), 'all ports released after down (no orphaned processes)')
})
