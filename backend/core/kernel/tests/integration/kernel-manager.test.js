'use strict'

const test = require('brittle')
const path = require('path')
const fs = require('fs')
const os = require('os')
const KernelManager = require('../../lib/kernel.manager')
const { createKernel } = require('../../index')

function createTmpDir (t) {
  const tmpDir = path.join(os.tmpdir(), `mdk-kernel-mgr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  fs.mkdirSync(path.join(tmpDir, 'config'), { recursive: true })
  fs.mkdirSync(path.join(tmpDir, 'store'), { recursive: true })
  t.teardown(() => fs.rmSync(tmpDir, { recursive: true, force: true }))
  return tmpDir
}

test('kernel-manager - init creates facilities and modules', async (t) => {
  const tmpDir = createTmpDir(t)

  const kernel = new KernelManager({}, {
    storeDir: path.join(tmpDir, 'store'),
    root: tmpDir
  })

  await kernel.init()

  t.ok(kernel._initialized, 'marked initialized')
  t.ok(kernel.store_s0, 'store facility created')
  t.ok(kernel.interval_0, 'interval facility created')
  t.ok(kernel.stores, 'hyperbee stores created')
  t.ok(kernel.registry, 'registry created')
  t.ok(kernel.dispatcher, 'dispatcher created')
  t.ok(kernel.stateMachine, 'state machine created')
  t.ok(kernel.telemetryCollector, 'telemetry collector created')
  t.ok(kernel.scheduler, 'scheduler created')
  t.ok(kernel.healthMonitor, 'health monitor created')
  t.ok(kernel.workerChannel, 'worker channel created')
  t.ok(kernel.actionCaller, 'action caller created')
  t.ok(kernel.actionApprover_0, 'action approver created')
  t.ok(kernel.actionManager, 'action manager created')

  await kernel.stop()
})

test('kernel-manager - init is idempotent', async (t) => {
  const tmpDir = createTmpDir(t)

  const kernel = new KernelManager({}, {
    storeDir: path.join(tmpDir, 'store'),
    root: tmpDir
  })

  await kernel.init()
  const firstRegistry = kernel.registry
  await kernel.init()
  t.is(kernel.registry, firstRegistry, 'same registry instance after double init')

  await kernel.stop()
})

test('kernel-manager - start throws if not initialized', async (t) => {
  const kernel = new KernelManager({}, {})
  try {
    await kernel.start()
    t.fail('should throw')
  } catch (err) {
    t.is(err.message, 'ERR_KERNEL_NOT_INITIALIZED')
  }
})

test('kernel-manager - start and stop lifecycle', async (t) => {
  const tmpDir = createTmpDir(t)

  const kernel = new KernelManager({}, {
    storeDir: path.join(tmpDir, 'store'),
    root: tmpDir
  })

  let startedEmitted = false
  let stoppedEmitted = false
  kernel.on('started', () => { startedEmitted = true })
  kernel.on('stopped', () => { stoppedEmitted = true })

  await kernel.init()
  await kernel.start()

  t.ok(kernel._started, 'marked started')
  t.ok(startedEmitted, 'started event emitted')
  t.is(kernel.registry.listWorkers().length, 0, 'no workers initially')

  await kernel.stop()
  t.absent(kernel._started, 'marked not started')
  t.ok(stoppedEmitted, 'stopped event emitted')
})

test('kernel-manager - scheduler fires after start', async (t) => {
  const tmpDir = createTmpDir(t)

  fs.writeFileSync(path.join(tmpDir, 'config', 'kernel.json'), JSON.stringify({
    healthPingMs: 50,
    telemetryPullMs: 50
  }))

  const kernel = new KernelManager({}, {
    storeDir: path.join(tmpDir, 'store'),
    root: tmpDir
  })

  await kernel.init()
  await kernel.start()

  t.ok(kernel.scheduler._running, 'scheduler is running')
  t.ok(kernel.scheduler._jobs.size >= 2, 'scheduler has jobs')

  await new Promise(resolve => setTimeout(resolve, 120))

  t.ok(kernel.healthMonitor._running, 'health monitor is running')

  await kernel.stop()
  t.absent(kernel.scheduler._running, 'scheduler stopped')
})

test('kernel-manager - getPublicKey returns null when HRPC disabled', async (t) => {
  const tmpDir = createTmpDir(t)

  const kernel = new KernelManager({ kernel: { hrpc: false } }, {
    storeDir: path.join(tmpDir, 'store'),
    root: tmpDir,
    loadConf: () => {}
  })

  await kernel.init()
  await kernel.start()

  t.absent(kernel.getPublicKey(), 'no public key when HRPC disabled')

  await kernel.stop()
})

test('kernel-manager - with HRPC config starts listener', async (t) => {
  const tmpDir = createTmpDir(t)

  fs.writeFileSync(path.join(tmpDir, 'config', 'kernel.json'), JSON.stringify({
    hrpc: { whitelist: [] }
  }))

  const kernel = new KernelManager({}, {
    storeDir: path.join(tmpDir, 'store'),
    root: tmpDir
  })

  await kernel.init()
  await kernel.start()

  t.ok(kernel.hrpcListener, 'HRPC listener created')
  const pk = kernel.getPublicKey()
  t.ok(pk, 'public key available')
  t.is(pk.length, 32, 'public key is 32 bytes')

  await kernel.stop()
})

test('kernel-manager - stop is safe to call multiple times', async (t) => {
  const tmpDir = createTmpDir(t)

  const kernel = new KernelManager({}, {
    storeDir: path.join(tmpDir, 'store'),
    root: tmpDir
  })

  await kernel.init()
  await kernel.start()
  await kernel.stop()
  await kernel.stop()
  t.pass('double stop did not throw')
})

test('createKernel - factory returns a valid KernelManager', async (t) => {
  const tmpDir = createTmpDir(t)

  const kernel = createKernel({
    db: path.join(tmpDir, 'store'),
    listeners: { hrpc: false },
    auth: { whitelist: [] }
  })

  t.ok(kernel instanceof KernelManager, 'returns an KernelManager instance')
  t.absent(kernel._initialized, 'not yet initialized')
  t.absent(kernel._started, 'not yet started')

  await kernel.init()
  t.ok(kernel._initialized, 'initialized after init()')
  t.ok(kernel.registry, 'registry created')
  t.ok(kernel.telemetryCollector, 'telemetry collector created')
  t.ok(kernel.stateMachine, 'state machine created')
  t.absent(kernel.hrpcListener, 'HRPC disabled')

  await kernel.start()
  t.ok(kernel._started, 'started after start()')

  await kernel.stop()
  t.absent(kernel._started, 'stopped')
})

test('createKernel - auth.whitelist populates hrpc whitelist', (t) => {
  const kernel = createKernel({
    auth: { whitelist: ['aabbcc'] },
    listeners: { hrpc: {} }
  })

  t.is(kernel.conf.kernel.hrpc.whitelist[0], 'aabbcc', 'whitelist forwarded to hrpc config')
})

test('createKernel - cadences forwarded to conf', (t) => {
  const kernel = createKernel({
    cadences: { telemetryPullMs: 2000, healthPingMs: 1000 }
  })

  t.is(kernel.conf.kernel.telemetryPullMs, 2000)
  t.is(kernel.conf.kernel.healthPingMs, 1000)
})

test('createKernel - discovery topic forwarded to conf', (t) => {
  const topic = 'aabbccdd'
  const kernel = createKernel({ discovery: { topic } })
  t.is(kernel.conf.kernel.discovery.topic, topic)
})

test('kernel-manager - drain marks executing commands TIMEOUT and sets _draining', async (t) => {
  const tmpDir = createTmpDir(t)

  const kernel = new KernelManager({ kernel: { hrpc: false } }, {
    storeDir: path.join(tmpDir, 'store'),
    root: tmpDir,
    loadConf: () => {}
  })

  await kernel.init()
  await kernel.start()

  // Inject EXECUTING entries directly — drain() mutates entries in-place
  const execEntry = {
    state: 'EXECUTING',
    deviceId: 'wm001',
    command: 'reboot',
    params: {},
    retries: 2,
    createdAt: Date.now()
  }
  const queuedEntry = {
    state: 'QUEUED',
    deviceId: 'wm002',
    command: 'setLED',
    params: {},
    retries: 3,
    createdAt: Date.now()
  }
  kernel.stateMachine._commands.set('cmd-exec', execEntry)
  kernel.stateMachine._commands.set('cmd-queued', queuedEntry)

  // stop() calls drain() internally before closing stores
  await kernel.stop()

  // drain() mutates entries in-place — verify via held references
  t.is(execEntry.state, 'TIMEOUT', 'EXECUTING → TIMEOUT on drain')
  t.is(execEntry.error, 'ERR_KERNEL_SHUTDOWN', 'error set to ERR_KERNEL_SHUTDOWN')
  t.is(queuedEntry.state, 'QUEUED', 'QUEUED entry state unchanged by drain')
  t.ok(kernel.stateMachine._draining, '_draining flag set after stop')
  t.is(kernel.stateMachine._commands.size, 0, 'all commands cleared from memory')
})
