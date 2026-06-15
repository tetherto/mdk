'use strict'

const test = require('brittle')
const path = require('path')
const fs = require('fs')
const os = require('os')
const OrkManager = require('../../lib/ork.manager')
const { createORK } = require('../../index')

function createTmpDir (t) {
  const tmpDir = path.join(os.tmpdir(), `mdk-ork-mgr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  fs.mkdirSync(path.join(tmpDir, 'config'), { recursive: true })
  fs.mkdirSync(path.join(tmpDir, 'store'), { recursive: true })
  t.teardown(() => fs.rmSync(tmpDir, { recursive: true, force: true }))
  return tmpDir
}

test('ork-manager - init creates facilities and modules', async (t) => {
  const tmpDir = createTmpDir(t)

  const ork = new OrkManager({}, {
    storeDir: path.join(tmpDir, 'store'),
    root: tmpDir
  })

  await ork.init()

  t.ok(ork._initialized, 'marked initialized')
  t.ok(ork.store_s0, 'store facility created')
  t.ok(ork.interval_0, 'interval facility created')
  t.ok(ork.stores, 'hyperbee stores created')
  t.ok(ork.registry, 'registry created')
  t.ok(ork.dispatcher, 'dispatcher created')
  t.ok(ork.stateMachine, 'state machine created')
  t.ok(ork.telemetryCollector, 'telemetry collector created')
  t.ok(ork.scheduler, 'scheduler created')
  t.ok(ork.healthMonitor, 'health monitor created')
  t.ok(ork.workerChannel, 'worker channel created')

  await ork.stop()
})

test('ork-manager - init is idempotent', async (t) => {
  const tmpDir = createTmpDir(t)

  const ork = new OrkManager({}, {
    storeDir: path.join(tmpDir, 'store'),
    root: tmpDir
  })

  await ork.init()
  const firstRegistry = ork.registry
  await ork.init()
  t.is(ork.registry, firstRegistry, 'same registry instance after double init')

  await ork.stop()
})

test('ork-manager - start throws if not initialized', async (t) => {
  const ork = new OrkManager({}, {})
  try {
    await ork.start()
    t.fail('should throw')
  } catch (err) {
    t.is(err.message, 'ERR_ORK_NOT_INITIALIZED')
  }
})

test('ork-manager - start and stop lifecycle', async (t) => {
  const tmpDir = createTmpDir(t)

  const ork = new OrkManager({}, {
    storeDir: path.join(tmpDir, 'store'),
    root: tmpDir
  })

  let startedEmitted = false
  let stoppedEmitted = false
  ork.on('started', () => { startedEmitted = true })
  ork.on('stopped', () => { stoppedEmitted = true })

  await ork.init()
  await ork.start()

  t.ok(ork._started, 'marked started')
  t.ok(startedEmitted, 'started event emitted')
  t.is(ork.registry.listWorkers().length, 0, 'no workers initially')

  await ork.stop()
  t.absent(ork._started, 'marked not started')
  t.ok(stoppedEmitted, 'stopped event emitted')
})

test('ork-manager - scheduler fires after start', async (t) => {
  const tmpDir = createTmpDir(t)

  fs.writeFileSync(path.join(tmpDir, 'config', 'ork.json'), JSON.stringify({
    healthPingMs: 50,
    telemetryPullMs: 50
  }))

  const ork = new OrkManager({}, {
    storeDir: path.join(tmpDir, 'store'),
    root: tmpDir
  })

  await ork.init()
  await ork.start()

  t.ok(ork.scheduler._running, 'scheduler is running')
  t.ok(ork.scheduler._jobs.size >= 2, 'scheduler has jobs')

  await new Promise(resolve => setTimeout(resolve, 120))

  t.ok(ork.healthMonitor._running, 'health monitor is running')

  await ork.stop()
  t.absent(ork.scheduler._running, 'scheduler stopped')
})

test('ork-manager - getPublicKey returns null when HRPC disabled', async (t) => {
  const tmpDir = createTmpDir(t)

  const ork = new OrkManager({ ork: { hrpc: false } }, {
    storeDir: path.join(tmpDir, 'store'),
    root: tmpDir,
    loadConf: () => {}
  })

  await ork.init()
  await ork.start()

  t.absent(ork.getPublicKey(), 'no public key when HRPC disabled')

  await ork.stop()
})

test('ork-manager - with HRPC config starts gateway', async (t) => {
  const tmpDir = createTmpDir(t)

  fs.writeFileSync(path.join(tmpDir, 'config', 'ork.json'), JSON.stringify({
    hrpc: { whitelist: [] }
  }))

  const ork = new OrkManager({}, {
    storeDir: path.join(tmpDir, 'store'),
    root: tmpDir
  })

  await ork.init()
  await ork.start()

  t.ok(ork.hrpcGateway, 'HRPC gateway created')
  const pk = ork.getPublicKey()
  t.ok(pk, 'public key available')
  t.is(pk.length, 32, 'public key is 32 bytes')

  await ork.stop()
})

test('ork-manager - stop is safe to call multiple times', async (t) => {
  const tmpDir = createTmpDir(t)

  const ork = new OrkManager({}, {
    storeDir: path.join(tmpDir, 'store'),
    root: tmpDir
  })

  await ork.init()
  await ork.start()
  await ork.stop()
  await ork.stop()
  t.pass('double stop did not throw')
})

test('createORK - factory returns a valid OrkManager', async (t) => {
  const tmpDir = createTmpDir(t)

  const ork = createORK({
    db: path.join(tmpDir, 'store'),
    gateways: { hrpc: false },
    auth: { whitelist: [] }
  })

  t.ok(ork instanceof OrkManager, 'returns an OrkManager instance')
  t.absent(ork._initialized, 'not yet initialized')
  t.absent(ork._started, 'not yet started')

  await ork.init()
  t.ok(ork._initialized, 'initialized after init()')
  t.ok(ork.registry, 'registry created')
  t.ok(ork.telemetryCollector, 'telemetry collector created')
  t.ok(ork.stateMachine, 'state machine created')
  t.absent(ork.hrpcGateway, 'HRPC disabled')

  await ork.start()
  t.ok(ork._started, 'started after start()')

  await ork.stop()
  t.absent(ork._started, 'stopped')
})

test('createORK - auth.whitelist populates hrpc whitelist', (t) => {
  const ork = createORK({
    auth: { whitelist: ['aabbcc'] },
    gateways: { hrpc: {} }
  })

  t.is(ork.conf.ork.hrpc.whitelist[0], 'aabbcc', 'whitelist forwarded to hrpc config')
})

test('createORK - cadences forwarded to conf', (t) => {
  const ork = createORK({
    cadences: { telemetryPullMs: 2000, healthPingMs: 1000 }
  })

  t.is(ork.conf.ork.telemetryPullMs, 2000)
  t.is(ork.conf.ork.healthPingMs, 1000)
})

test('createORK - discovery topic forwarded to conf', (t) => {
  const topic = 'aabbccdd'
  const ork = createORK({ discovery: { topic } })
  t.is(ork.conf.ork.discovery.topic, topic)
})

test('ork-manager - drain marks executing commands TIMEOUT and sets _draining', async (t) => {
  const tmpDir = createTmpDir(t)

  const ork = new OrkManager({ ork: { hrpc: false } }, {
    storeDir: path.join(tmpDir, 'store'),
    root: tmpDir,
    loadConf: () => {}
  })

  await ork.init()
  await ork.start()

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
  ork.stateMachine._commands.set('cmd-exec', execEntry)
  ork.stateMachine._commands.set('cmd-queued', queuedEntry)

  // stop() calls drain() internally before closing stores
  await ork.stop()

  // drain() mutates entries in-place — verify via held references
  t.is(execEntry.state, 'TIMEOUT', 'EXECUTING → TIMEOUT on drain')
  t.is(execEntry.error, 'ERR_ORK_SHUTDOWN', 'error set to ERR_ORK_SHUTDOWN')
  t.is(queuedEntry.state, 'QUEUED', 'QUEUED entry state unchanged by drain')
  t.ok(ork.stateMachine._draining, '_draining flag set after stop')
  t.is(ork.stateMachine._commands.size, 0, 'all commands cleared from memory')
})
