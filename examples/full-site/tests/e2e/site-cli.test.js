'use strict'

// Scripted live e2e for the full-site CLI. Drives the dispatcher programmatically
// (the same code path `node cli.js` uses) against REAL spawned processes with
// --miners 3 for speed, and asserts real behaviour over HRPC + HTTP — not just
// PID liveness. Slow by nature (boots mocks + ORK + 4 workers + app-node).

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
const PORTS = [HTTP, 14100, 5502, 5503, 8010]
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function portsHeld () {
  try { return execSync(`lsof -ti:${PORTS.join(',')} 2>/dev/null || true`).toString().trim() } catch { return '' }
}

test('site CLI e2e: up, status, overview, seed, logs, ps, down', { timeout: 180000 }, async (t) => {
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

  // 1. up --miners 3 brings the site up; status reports ORK key + all READY.
  await dispatch('up --miners 3 --no-ui')
  t.ok(out.some((l) => l.includes('Site up.')), 'up completed')

  const status = await fetchStatus(root)
  t.is(status.orkKey.length, 64, 'ORK key surfaced over HRPC')
  t.is(status.workers.length, 4, '4 workers registered')
  t.ok(status.workers.every((w) => w.state === 'READY'), 'all workers READY (queried over HRPC)')

  // 2. /site/overview returns the expected miner count.
  const overview = await (await fetch(`http://127.0.0.1:${HTTP}/site/overview`)).json()
  t.is(overview.miners.length, 3, '/site/overview reports 3 miners')

  // 3. seed miner adds a device that appears in /site/overview after refresh.
  await dispatch('seed miner')
  const overview2 = await (await fetch(`http://127.0.0.1:${HTTP}/site/overview`)).json()
  t.is(overview2.miners.length, 4, 'seeded miner appears in /site/overview')

  // 4. logs ork shows ORK output; grep filters a worker's log.
  out.length = 0
  await dispatch('logs ork')
  t.ok(out.join('\n').includes('MDK_READY ork'), 'logs ork shows ORK output')
  out.length = 0
  await dispatch('logs miner-worker --grep MDK_READY')
  t.ok(out.join('\n').includes('worker:miner'), 'logs --grep filters the worker log')

  // 5. ps lists every spawned child with a pid.
  const rows = pm.list()
  t.is(rows.length, 7, 'mocks + ork + 4 workers + app-node tracked')
  t.ok(rows.every((r) => typeof r.pid === 'number' && r.pid > 0), 'every child has a pid')

  // 6. down stops all children; ports are released.
  await dispatch('down')
  await sleep(2500)
  t.absent(portsHeld(), 'all ports released after down (no orphaned processes)')
})
