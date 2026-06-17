'use strict'

// Unit tests for the CLI's pure/injectable pieces — command parsing, the
// process registry + ps formatting, log routing, and status/keys rendering —
// with fake child handles and a fake ORK client (no real processes, no network).

const test = require('brittle')
const os = require('os')
const fs = require('fs')
const path = require('path')
const { EventEmitter } = require('events')

const { parseCommand, createDispatcher } = require('../../cli/commands')
const { startComponentResilient } = require('../../cli/commands/components')
const { ProcessManager } = require('../../cli/process-manager')

const SITE = path.join(__dirname, '..', '..')
const { fetchStatus, readKeys } = require('../../backend/inspect')
const { renderStatus, renderKeys } = require('../../cli/render')
const { ps } = require('../../cli/commands/ps')

function tmpRoot (t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-cli-test-'))
  t.teardown(() => { try { fs.rmSync(root, { recursive: true, force: true }) } catch {} })
  return root
}

// A fake child: stdout/stderr emitters, a pid, and a kill() that emits exit.
function fakeChild () {
  const c = new EventEmitter()
  c.stdout = new EventEmitter()
  c.stderr = new EventEmitter()
  c.pid = 4242
  c.killed = null
  c.kill = (sig) => { c.killed = sig; setImmediate(() => c.emit('exit', null, sig || 'SIGTERM')) }
  return c
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 60))

function fakePM (t) {
  const children = []
  const spawn = () => { const c = fakeChild(); children.push(c); return c }
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-cli-test-'))
  const pm = new ProcessManager({ root, cwd: '/tmp', spawn })
  // Stop procs (closing their log streams) before removing the dir, so a late
  // write can't land after teardown.
  t.teardown(async () => {
    try { await pm.stopAll() } catch {}
    await tick()
    try { fs.rmSync(root, { recursive: true, force: true }) } catch {}
  })
  return { pm, children }
}

test('parseCommand splits args and value/boolean flags', (t) => {
  t.alike(parseCommand('up --miners 3'), { command: 'up', args: [], flags: { miners: '3' } })
  t.alike(parseCommand('start worker miner'), { command: 'start', args: ['worker', 'miner'], flags: {} })
  t.alike(parseCommand('logs ork -f --grep boot'), { command: 'logs', args: ['ork'], flags: { f: true, grep: 'boot' } })
  t.alike(parseCommand('up --no-ui'), { command: 'up', args: [], flags: { 'no-ui': true } })
  t.is(parseCommand('   '), null)
})

test('process manager: status transitions on ready token and exit', async (t) => {
  const { pm } = fakePM(t)
  const rec = pm.spawn('ork', 'proc/ork.js', ['--root', '/x'])
  t.is(rec.status, 'starting')
  t.is(pm.isAlive('ork'), true)

  const ready = pm.waitForReady('ork', 2000)
  rec.child.stdout.emit('data', Buffer.from('booting\nMDK_READY ork key=abcd\n'))
  await ready
  t.is(pm.get('ork').status, 'running')

  rec.child.emit('exit', 0, null)
  t.is(pm.get('ork').status, 'exited')
  t.is(pm.isAlive('ork'), false)
})

test('process manager: non-ready exit is failed', async (t) => {
  const { pm } = fakePM(t)
  const rec = pm.spawn('ork', 'proc/ork.js')
  rec.child.emit('exit', 1, null)
  t.is(pm.get('ork').status, 'failed')
})

test('process manager: ps snapshot shape', async (t) => {
  const { pm } = fakePM(t)
  const rec = pm.spawn('mocks', 'proc/mocks.js', ['--miners', '3'])
  rec.child.stdout.emit('data', Buffer.from('MDK_READY mocks miners=3\n'))
  await tick()
  const rows = pm.list()
  t.is(rows.length, 1)
  t.is(rows[0].name, 'mocks')
  t.is(rows[0].pid, 4242)
  t.is(rows[0].status, 'running')
  t.ok(rows[0].uptimeMs >= 0)
  t.ok(rows[0].logPath.endsWith('mocks.log'))
})

test('process manager: log routing + tail + grep', async (t) => {
  const { pm } = fakePM(t)
  const rec = pm.spawn('worker', 'proc/worker.js')
  rec.child.stdout.emit('data', Buffer.from('line one\nMDK_READY worker:miner id=miner-worker\n'))
  rec.child.stderr.emit('data', Buffer.from('a warning\n'))
  await tick()
  const log = pm.readLog('worker')
  t.ok(log.includes('MDK_READY worker:miner'))
  t.ok(log.includes('a warning'))
  t.is(pm.grepLog('worker', 'MDK_READY').length, 1)
  t.is(pm.grepLog('worker', 'nomatch').length, 0)
  t.ok(pm.tailLog('worker', 2).includes('MDK_READY'))
})

test('process manager: stop sends SIGTERM and resolves on exit', async (t) => {
  const { pm } = fakePM(t)
  const rec = pm.spawn('ork', 'proc/ork.js')
  await pm.stop('ork')
  t.is(rec.child.killed, 'SIGTERM')
  t.is(pm.isAlive('ork'), false)
})

test('process manager: stopAll stops in reverse spawn order', async (t) => {
  const { pm } = fakePM(t)
  pm.spawn('mocks', 'm'); pm.spawn('ork', 'o'); pm.spawn('app-node', 'a')
  const order = await pm.stopAll()
  t.alike(order, ['app-node', 'ork', 'mocks'])
})

test('process manager: spawning a live name twice throws', (t) => {
  const { pm } = fakePM(t)
  pm.spawn('ork', 'o')
  t.exception(() => pm.spawn('ork', 'o'), /ERR_PROC_ALREADY_RUNNING/)
})

test('fetchStatus merges orkKey with the client.getStatus() shape', async (t) => {
  const root = tmpRoot(t)
  fs.writeFileSync(path.join(root, '.ork-key'), 'ab'.repeat(32))
  // Shaping/retry now live in client.getStatus(); fetchStatus just delegates
  // and stamps the orkKey it read from disk.
  const fakeClient = {
    connect: async () => {},
    close: async () => {},
    getStatus: async () => ({
      workers: [{ workerId: 'miner-worker', state: 'READY', healthState: 'HEALTHY', deviceIds: ['miner-0', 'miner-1'], deviceCount: 2, rpcKey: 'aa' }],
      totalDevices: 2
    })
  }
  const s = await fetchStatus(root, { clientFactory: () => fakeClient })
  t.is(s.orkKey, 'ab'.repeat(32))
  t.is(s.workers[0].deviceCount, 2)
  t.is(s.totalDevices, 2)
})

test('fetchStatus forwards retry/timeout opts to client.getStatus()', async (t) => {
  const root = tmpRoot(t)
  fs.writeFileSync(path.join(root, '.ork-key'), 'ab'.repeat(32))
  let seenOpts
  const fakeClient = {
    connect: async () => {},
    close: async () => {},
    getStatus: async (opts) => { seenOpts = opts; return { workers: [], totalDevices: 0 } }
  }
  await fetchStatus(root, { clientFactory: () => fakeClient, retries: 5, timeoutMs: 1234 })
  t.alike(seenOpts, { retries: 5, timeoutMs: 1234 }, 'clientFactory stripped, rest forwarded')
})

test('fetchStatus throws ERR_ORK_KEY_MISSING when ORK not started', async (t) => {
  const root = tmpRoot(t)
  await t.exception(() => fetchStatus(root, { clientFactory: () => ({}) }), /ERR_ORK_KEY_MISSING/)
})

test('readKeys reads ORK + published worker RPC keys', (t) => {
  const root = tmpRoot(t)
  fs.writeFileSync(path.join(root, '.ork-key'), 'cd'.repeat(32))
  const kdir = path.join(root, '.worker-keys')
  fs.mkdirSync(kdir)
  fs.writeFileSync(path.join(kdir, 'miner-worker.key'), 'ee'.repeat(32))
  const k = readKeys(root)
  t.is(k.orkKey, 'cd'.repeat(32))
  t.is(k.workers.length, 1)
  t.is(k.workers[0].workerId, 'miner-worker')
  t.is(k.workers[0].rpcKey, 'ee'.repeat(32))
})

test('renderStatus / renderKeys format tables', (t) => {
  const status = { orkKey: 'ff'.repeat(32), workers: [{ workerId: 'miner-worker', state: 'READY', healthState: 'HEALTHY', deviceCount: 3 }], totalDevices: 3 }
  const out = renderStatus(status)
  t.ok(out.includes('ORK  ' + 'ff'.repeat(32)))
  t.ok(out.includes('miner-worker'))
  t.ok(out.includes('READY'))
  t.ok(out.includes('1 worker(s), 3 device(s)'))

  const keys = renderKeys({ orkKey: '11'.repeat(32), workers: [{ workerId: 'miner-worker', rpcKey: '22'.repeat(32) }] })
  t.ok(keys.includes('11'.repeat(32)))
  t.ok(keys.includes('22'.repeat(32)))
})

test('ps handler renders header + a row', (t) => {
  const out = []
  ps({ pm: { list: () => [{ name: 'ork', pid: 99, status: 'running', uptimeMs: 12000, logPath: '/x/ork.log' }] }, print: (s) => out.push(s) })
  t.ok(out[0].includes('NAME'))
  t.ok(out[1].includes('ork') && out[1].includes('99') && out[1].includes('running') && out[1].includes('12s'))
})

test('startComponentResilient retries once after a crash before ready', async (t) => {
  const { pm, children } = fakePM(t)
  const ctx = { pm, siteDir: SITE, root: '/x', httpPort: 1, uiPort: 2 }
  const retries = []
  const p = startComponentResilient(ctx, 'miner-worker', { minerCount: 3, retryDelayMs: 10, onRetry: (n) => retries.push(n) })

  await tick()
  children[0].emit('exit', 1, null) // first attempt crashes before ready
  await new Promise((resolve) => setTimeout(resolve, 60))
  children[1].stdout.emit('data', Buffer.from('MDK_READY worker:miner\n')) // retry becomes ready
  await p

  t.is(retries.length, 1, 'onRetry fired once')
  t.is(children.length, 2, 're-spawned exactly once')
  t.is(pm.get('miner-worker').status, 'running')
})

test('dispatcher: unknown command and unmet dependency yield ERR_*, no throw', async (t) => {
  const out = []
  const ctx = { pm: { isAlive: () => false, has: () => false }, root: '/none', siteDir: '/x', httpPort: 1, uiPort: 2, print: (s) => out.push(s) }
  const { dispatch } = createDispatcher(ctx)
  await dispatch('bogus')
  await dispatch('start worker miner')
  t.ok(out[0].startsWith('ERR_UNKNOWN_COMMAND'))
  t.is(out[1], 'ERR_ORK_NOT_RUNNING')
})
