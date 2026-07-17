'use strict'

// Unit tests for the CLI's pure/injectable pieces — command parsing, the
// process registry + ps formatting, log routing, and status/keys rendering —
// with fake child handles and a fake Kernel client (no real processes, no network).

const test = require('brittle')
const os = require('os')
const fs = require('fs')
const path = require('path')
const { EventEmitter } = require('events')

const { parseCommand, createDispatcher } = require('../../cli/commands')
const { startComponentResilient, spawnDescriptor, resolveProcName, WORKER_SPECS } = require('../../cli/commands/components')
const { ProcessManager } = require('../../cli/process-manager')
const { SEED_TYPES } = require('../../backend/provision')

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
  t.alike(parseCommand('start worker whatsminer'), { command: 'start', args: ['worker', 'whatsminer'], flags: {} })
  t.alike(parseCommand('logs kernel -f --grep boot'), { command: 'logs', args: ['kernel'], flags: { f: true, grep: 'boot' } })
  t.alike(parseCommand('up --no-ui'), { command: 'up', args: [], flags: { 'no-ui': true } })
  t.is(parseCommand('   '), null)
})

test('process manager: status transitions on ready token and exit', async (t) => {
  const { pm } = fakePM(t)
  const rec = pm.spawn('kernel', 'proc/kernel.js', ['--root', '/x'])
  t.is(rec.status, 'starting')
  t.is(pm.isAlive('kernel'), true)

  const ready = pm.waitForReady('kernel', 2000)
  rec.child.stdout.emit('data', Buffer.from('booting\nMDK_READY kernel key=abcd\n'))
  await ready
  t.is(pm.get('kernel').status, 'running')

  rec.child.emit('exit', 0, null)
  t.is(pm.get('kernel').status, 'exited')
  t.is(pm.isAlive('kernel'), false)
})

test('process manager: non-ready exit is failed', async (t) => {
  const { pm } = fakePM(t)
  const rec = pm.spawn('kernel', 'proc/kernel.js')
  rec.child.emit('exit', 1, null)
  t.is(pm.get('kernel').status, 'failed')
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
  rec.child.stdout.emit('data', Buffer.from('line one\nMDK_READY worker:whatsminer id=whatsminer-worker\n'))
  rec.child.stderr.emit('data', Buffer.from('a warning\n'))
  await tick()
  const log = pm.readLog('worker')
  t.ok(log.includes('MDK_READY worker:whatsminer'))
  t.ok(log.includes('a warning'))
  t.is(pm.grepLog('worker', 'MDK_READY').length, 1)
  t.is(pm.grepLog('worker', 'nomatch').length, 0)
  t.ok(pm.tailLog('worker', 2).includes('MDK_READY'))
})

test('process manager: stop sends SIGTERM and resolves on exit', async (t) => {
  const { pm } = fakePM(t)
  const rec = pm.spawn('kernel', 'proc/kernel.js')
  await pm.stop('kernel')
  t.is(rec.child.killed, 'SIGTERM')
  t.is(pm.isAlive('kernel'), false)
})

test('process manager: stopAll stops in reverse spawn order', async (t) => {
  const { pm } = fakePM(t)
  pm.spawn('mocks', 'm'); pm.spawn('kernel', 'o'); pm.spawn('gateway', 'a')
  const order = await pm.stopAll()
  t.alike(order, ['gateway', 'kernel', 'mocks'])
})

test('process manager: spawning a live name twice throws', (t) => {
  const { pm } = fakePM(t)
  pm.spawn('kernel', 'o')
  t.exception(() => pm.spawn('kernel', 'o'), /ERR_PROC_ALREADY_RUNNING/)
})

test('fetchStatus merges kernelKey with the client.getStatus() shape', async (t) => {
  const root = tmpRoot(t)
  fs.writeFileSync(path.join(root, '.kernel-key'), 'ab'.repeat(32))
  // Shaping/retry now live in client.getStatus(); fetchStatus just delegates
  // and stamps the kernelKey it read from disk.
  const fakeClient = {
    connect: async () => {},
    close: async () => {},
    getStatus: async () => ({
      workers: [{ workerId: 'whatsminer-worker', state: 'READY', healthState: 'HEALTHY', deviceIds: ['whatsminer-0', 'whatsminer-1'], deviceCount: 2, rpcKey: 'aa' }],
      totalDevices: 2
    })
  }
  const s = await fetchStatus(root, { clientFactory: () => fakeClient })
  t.is(s.kernelKey, 'ab'.repeat(32))
  t.is(s.workers[0].deviceCount, 2)
  t.is(s.totalDevices, 2)
})

test('fetchStatus forwards retry/timeout opts to client.getStatus()', async (t) => {
  const root = tmpRoot(t)
  fs.writeFileSync(path.join(root, '.kernel-key'), 'ab'.repeat(32))
  let seenOpts
  const fakeClient = {
    connect: async () => {},
    close: async () => {},
    getStatus: async (opts) => { seenOpts = opts; return { workers: [], totalDevices: 0 } }
  }
  await fetchStatus(root, { clientFactory: () => fakeClient, retries: 5, timeoutMs: 1234 })
  t.alike(seenOpts, { retries: 5, timeoutMs: 1234 }, 'clientFactory stripped, rest forwarded')
})

test('fetchStatus throws ERR_KERNEL_KEY_MISSING when Kernel not started', async (t) => {
  const root = tmpRoot(t)
  await t.exception(() => fetchStatus(root, { clientFactory: () => ({}) }), /ERR_KERNEL_KEY_MISSING/)
})

test('readKeys reads Kernel + published worker RPC keys', (t) => {
  const root = tmpRoot(t)
  fs.writeFileSync(path.join(root, '.kernel-key'), 'cd'.repeat(32))
  const kdir = path.join(root, '.worker-keys')
  fs.mkdirSync(kdir)
  fs.writeFileSync(path.join(kdir, 'whatsminer-worker.key'), 'ee'.repeat(32))
  const k = readKeys(root)
  t.is(k.kernelKey, 'cd'.repeat(32))
  t.is(k.workers.length, 1)
  t.is(k.workers[0].workerId, 'whatsminer-worker')
  t.is(k.workers[0].rpcKey, 'ee'.repeat(32))
})

test('renderStatus / renderKeys format tables', (t) => {
  const status = { kernelKey: 'ff'.repeat(32), workers: [{ workerId: 'whatsminer-worker', state: 'READY', healthState: 'HEALTHY', deviceCount: 3 }], totalDevices: 3 }
  const out = renderStatus(status)
  t.ok(out.includes('Kernel  ' + 'ff'.repeat(32)))
  t.ok(out.includes('whatsminer-worker'))
  t.ok(out.includes('READY'))
  t.ok(out.includes('1 worker(s), 3 device(s)'))

  const keys = renderKeys({ kernelKey: '11'.repeat(32), workers: [{ workerId: 'whatsminer-worker', rpcKey: '22'.repeat(32) }] })
  t.ok(keys.includes('11'.repeat(32)))
  t.ok(keys.includes('22'.repeat(32)))
})

test('ps handler renders header + a row', (t) => {
  const out = []
  ps({ pm: { list: () => [{ name: 'kernel', pid: 99, status: 'running', uptimeMs: 12000, logPath: '/x/kernel.log' }] }, print: (s) => out.push(s) })
  t.ok(out[0].includes('NAME'))
  t.ok(out[1].includes('kernel') && out[1].includes('99') && out[1].includes('running') && out[1].includes('12s'))
})

test('workerSpec + spawnDescriptor + resolveProcName cover all worker families', (t) => {
  const { workerSpec } = require('../../backend/site')
  const ctx = { siteDir: SITE, root: '/x', httpPort: 1, uiPort: 2, discovery: 'local' }

  t.is(WORKER_SPECS.length, 11, 'full-site exposes 11 worker families')
  for (const spec of WORKER_SPECS) {
    t.alike(workerSpec(spec.name), spec, `${spec.name}: short token resolves`)
    t.alike(workerSpec(spec.workerId), spec, `${spec.workerId}: workerId resolves`)
    t.is(resolveProcName(spec.name), spec.workerId, `${spec.name}: resolveProcName`)
    t.is(resolveProcName(spec.workerId), spec.workerId, `${spec.workerId}: resolveProcName`)

    const desc = spawnDescriptor(ctx, spec.workerId, { minerCount: 3 })
    t.is(desc.procName, spec.workerId, `${spec.name}: proc name`)
    t.ok(desc.entry.endsWith(path.join('backend', 'proc', 'worker.js')), `${spec.name}: worker entry`)
    t.ok(desc.argv.includes('--worker'), `${spec.name}: --worker flag`)
    t.ok(desc.argv.includes(spec.name), `${spec.name}: worker token in argv`)
    t.ok(desc.argv.includes('--miners'), `${spec.name}: --miners flag`)
    t.ok(desc.argv.includes('3'), `${spec.name}: miner count in argv`)
  }
})

test('parseCommand accepts start worker and seed for all device tokens', (t) => {
  for (const spec of WORKER_SPECS) {
    t.alike(
      parseCommand(`start worker ${spec.name}`),
      { command: 'start', args: ['worker', spec.name], flags: {} },
      `start worker ${spec.name}`
    )
  }
  for (const type of Object.keys(SEED_TYPES)) {
    t.alike(
      parseCommand(`seed ${type} --port 9999`),
      { command: 'seed', args: [type], flags: { port: '9999' } },
      `seed ${type}`
    )
  }
})

test('startComponentResilient retries once for every worker family', async (t) => {
  for (const spec of WORKER_SPECS) {
    const { pm, children } = fakePM(t)
    const ctx = { pm, siteDir: SITE, root: '/x', httpPort: 1, uiPort: 2 }
    const retries = []
    const p = startComponentResilient(ctx, spec.workerId, {
      minerCount: 3,
      retryDelayMs: 10,
      onRetry: () => retries.push(spec.workerId)
    })

    await tick()
    children[0].emit('exit', 1, null)
    await new Promise((resolve) => setTimeout(resolve, 60))
    children[1].stdout.emit('data', Buffer.from(`MDK_READY worker:${spec.name} id=${spec.workerId}\n`))
    await p

    t.is(retries.length, 1, `${spec.name}: onRetry fired once`)
    t.is(children.length, 2, `${spec.name}: re-spawned exactly once`)
    t.is(pm.get(spec.workerId).status, 'running', `${spec.name}: running after retry`)
  }
})

test('readKeys / renderStatus cover all worker families', (t) => {
  const root = tmpRoot(t)
  fs.writeFileSync(path.join(root, '.kernel-key'), 'cd'.repeat(32))
  const kdir = path.join(root, '.worker-keys')
  fs.mkdirSync(kdir)
  for (const spec of WORKER_SPECS) {
    fs.writeFileSync(path.join(kdir, `${spec.workerId}.key`), 'ee'.repeat(32))
  }

  const k = readKeys(root)
  t.is(k.workers.length, WORKER_SPECS.length)
  for (const spec of WORKER_SPECS) {
    t.ok(k.workers.some((w) => w.workerId === spec.workerId), `${spec.workerId} key read`)
  }

  const workers = WORKER_SPECS.map((spec) => ({
    workerId: spec.workerId,
    state: 'READY',
    healthState: 'HEALTHY',
    deviceCount: spec.pool ? 0 : 1
  }))
  const status = {
    kernelKey: 'ff'.repeat(32),
    workers,
    totalDevices: workers.reduce((n, w) => n + w.deviceCount, 0)
  }
  const out = renderStatus(status)
  for (const spec of WORKER_SPECS) {
    t.ok(out.includes(spec.workerId), `renderStatus lists ${spec.workerId}`)
  }
  t.ok(out.includes(`${WORKER_SPECS.length} worker(s)`))

  const keys = renderKeys({
    kernelKey: '11'.repeat(32),
    workers: WORKER_SPECS.map((spec) => ({ workerId: spec.workerId, rpcKey: '22'.repeat(32) }))
  })
  for (const spec of WORKER_SPECS) {
    t.ok(keys.includes(spec.workerId), `renderKeys lists ${spec.workerId}`)
  }
})

test('dispatcher: unknown command and unmet dependency yield ERR_*, no throw', async (t) => {
  const out = []
  const ctx = { pm: { isAlive: () => false, has: () => false }, root: '/none', siteDir: '/x', httpPort: 1, uiPort: 2, print: (s) => out.push(s) }
  const { dispatch } = createDispatcher(ctx)
  await dispatch('bogus')
  await dispatch('start worker whatsminer')
  t.ok(out[0].startsWith('ERR_UNKNOWN_COMMAND'))
  t.is(out[1], 'ERR_KERNEL_NOT_RUNNING')
})

test('dispatcher start worker accepts every worker family', async (t) => {
  const out = []
  const ctx = { pm: { isAlive: () => false, has: () => false }, root: '/none', siteDir: '/x', httpPort: 1, uiPort: 2, print: (s) => out.push(s) }
  const { dispatch } = createDispatcher(ctx)

  for (const spec of WORKER_SPECS) {
    const before = out.length
    await dispatch(`start worker ${spec.name}`)
    t.is(out[out.length - 1], 'ERR_KERNEL_NOT_RUNNING', `${spec.name}: recognized, blocked on Kernel`)
    t.is(out.length, before + 1, `${spec.name}: single error line`)
  }
})

test('dispatcher seed rejects unknown type and accepts every seedable device', async (t) => {
  const workerIds = new Set(Object.values(SEED_TYPES).map((s) => s.workerId))
  const out = []
  const ctx = {
    pm: { isAlive: (n) => n === 'kernel' || workerIds.has(n) },
    root: '/none',
    siteDir: '/x',
    httpPort: 1,
    uiPort: 2,
    print: (s) => out.push(s)
  }
  const { dispatch } = createDispatcher(ctx)

  await dispatch('seed bogus')
  t.ok(out[0].includes('ERR_UNKNOWN_SEED_TYPE'), 'unknown seed type rejected')

  for (const type of Object.keys(SEED_TYPES)) {
    const before = out.length
    await dispatch(`seed ${type}`)
    t.absent(out.slice(before).find((line) => line.includes('ERR_UNKNOWN_SEED_TYPE')), `${type}: known seed type`)
  }
})
