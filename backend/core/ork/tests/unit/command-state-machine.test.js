'use strict'

const test = require('brittle')
const path = require('path')
const fs = require('fs')
const os = require('os')
const Corestore = require('corestore')
const Hyperbee = require('hyperbee')
const { CommandStateMachine } = require('../../lib/modules/command-state-machine')
const { COMMAND_STATES } = require('../../lib/modules/command-state-machine/states')

async function createTestBee (t) {
  const tmpDir = path.join(os.tmpdir(), `mdk-csm-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  fs.mkdirSync(tmpDir, { recursive: true })
  const store = new Corestore(tmpDir)
  const core = store.get({ name: 'csm-test' })
  const bee = new Hyperbee(core, { keyEncoding: 'utf-8' })
  await bee.ready()
  t.teardown(async () => {
    await bee.close()
    await store.close()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
  return bee
}

function createCSM (walStore, opts = {}) {
  const registry = {
    resolveWorkerForDevice () {
      if (opts.noWorker) return null
      return { workerId: 'w1', channel: opts.channel || {} }
    },
    isRoutable () { return opts.routable !== false }
  }
  const workerChannel = {
    async send (channel, envelope, sendOpts) {
      if (opts.sendFn) return opts.sendFn(envelope)
      if (opts.shouldTimeout) throw new Error('ERR_CHANNEL_TIMEOUT')
      return { payload: { status: 'SUCCESS', result: { ok: true } } }
    }
  }
  return new CommandStateMachine({
    wal: walStore,
    workerChannel,
    registry,
    maxRetries: opts.maxRetries !== undefined ? opts.maxRetries : 3,
    timeoutMs: opts.timeoutMs || 5000
  })
}

function waitForCommand (csm, commandId) {
  return new Promise(resolve => {
    csm.on('command:done', function handler (data) {
      if (data.commandId === commandId) {
        csm.off('command:done', handler)
        resolve(data)
      }
    })
  })
}

test('csm - enqueue returns commandId before dispatch completes', async (t) => {
  const bee = await createTestBee(t)
  const csm = createCSM(bee.sub('wal'))

  let dispatchStarted = false
  csm.workerChannel = {
    async send () {
      dispatchStarted = true
      return { payload: { status: 'SUCCESS', result: {} } }
    }
  }

  const before = Date.now()
  const commandId = await csm.enqueue({ deviceId: 'wm001', command: 'reboot', params: {}, requesterId: 'test' })
  const elapsed = Date.now() - before

  t.ok(commandId, 'commandId returned')
  t.ok(elapsed < 100, 'enqueue returned immediately (not blocked by dispatch)')

  await waitForCommand(csm, commandId)
  t.ok(dispatchStarted, 'dispatch still ran')
})

test('csm - enqueue + dispatch → SUCCESS with real WAL', async (t) => {
  const bee = await createTestBee(t)
  const csm = createCSM(bee.sub('wal'))

  const commandId = await csm.enqueue({
    deviceId: 'wm001',
    command: 'reboot',
    params: {},
    requesterId: 'test'
  })

  const done = await waitForCommand(csm, commandId)
  t.is(done.state, COMMAND_STATES.SUCCESS, 'command succeeded')
  t.absent(await csm.getState(commandId), 'terminal state removed from memory and WAL')
})

test('csm - dispatch to unreachable worker stays QUEUED', async (t) => {
  const bee = await createTestBee(t)
  const csm = createCSM(bee.sub('wal'), { noWorker: true })

  const commandId = await csm.enqueue({
    deviceId: 'wm001',
    command: 'reboot',
    params: {},
    requesterId: 'test'
  })

  await new Promise(resolve => setImmediate(resolve))
  const state = await csm.getState(commandId)
  t.ok(state, 'command still exists')
  t.is(state.state, COMMAND_STATES.QUEUED, 'stays QUEUED when worker unavailable')
})

test('csm - timeout uses TIMEOUT state then re-queues', async (t) => {
  const bee = await createTestBee(t)
  let callCount = 0

  const csm = createCSM(bee.sub('wal'), {
    sendFn: async () => {
      callCount++
      if (callCount < 2) throw new Error('ERR_CHANNEL_TIMEOUT')
      return { payload: { status: 'SUCCESS', result: {} } }
    },
    maxRetries: 3
  })

  const commandId = await csm.enqueue({ deviceId: 'wm001', command: 'reboot', params: {}, requesterId: 'test' })
  const done = await waitForCommand(csm, commandId)

  t.is(done.state, COMMAND_STATES.SUCCESS, 'succeeded after retry')
  t.is(callCount, 2, 'dispatched twice (one timeout + one success)')
})

test('csm - timeout decrements retries correctly', async (t) => {
  const bee = await createTestBee(t)
  let callCount = 0

  const csm = createCSM(bee.sub('wal'), {
    sendFn: async () => {
      callCount++
      throw new Error('ERR_CHANNEL_TIMEOUT')
    },
    maxRetries: 2
  })

  const commandId = await csm.enqueue({ deviceId: 'wm001', command: 'reboot', params: {}, requesterId: 'test' })
  const done = await waitForCommand(csm, commandId)

  t.is(done.state, COMMAND_STATES.FAILED, 'exhausted retries → FAILED')
  t.is(done.error, 'ERR_MAX_RETRIES_EXHAUSTED')
  t.is(callCount, 3, 'dispatched 3 times (maxRetries=2 means 1 initial + 2 retries)')
})

test('csm - worker error with retries=0 marks FAILED immediately', async (t) => {
  const bee = await createTestBee(t)
  const csm = createCSM(bee.sub('wal'), {
    sendFn: () => ({ payload: { status: 'FAILED', error: 'ERR_DEVICE_OFFLINE' } }),
    maxRetries: 0
  })

  const commandId = await csm.enqueue({ deviceId: 'wm001', command: 'reboot', params: {}, requesterId: 'test' })
  const done = await waitForCommand(csm, commandId)

  t.is(done.state, COMMAND_STATES.FAILED)
  t.is(done.error, 'ERR_DEVICE_OFFLINE')
  const pending = await csm.wal.getPending()
  t.is(pending.length, 0, 'no pending — FAILED is terminal')
})

test('csm - worker returns FAILED status', async (t) => {
  const bee = await createTestBee(t)
  const csm = createCSM(bee.sub('wal'), {
    sendFn: () => ({ payload: { status: 'FAILED', error: 'ERR_DEVICE_OFFLINE' } })
  })

  const commandId = await csm.enqueue({ deviceId: 'wm001', command: 'reboot', params: {}, requesterId: 'test' })
  const done = await waitForCommand(csm, commandId)

  t.is(done.state, COMMAND_STATES.FAILED)
  const pending = await csm.wal.getPending()
  t.is(pending.length, 0, 'FAILED is terminal')
})

test('csm - cancel QUEUED command emits command:done', async (t) => {
  const bee = await createTestBee(t)
  const csm = createCSM(bee.sub('wal'), { noWorker: true })

  const commandId = await csm.enqueue({ deviceId: 'wm001', command: 'reboot', params: {}, requesterId: 'test' })
  await new Promise(resolve => setImmediate(resolve))

  t.ok(await csm.getState(commandId), 'command exists before cancel')

  const donePromise = waitForCommand(csm, commandId)
  const cancelled = await csm.cancel(commandId)
  const done = await donePromise

  t.ok(cancelled, 'cancel returned true')
  t.is(done.state, COMMAND_STATES.FAILED)
  t.is(done.error, 'ERR_CANCELLED')
  t.absent(await csm.getState(commandId), 'command removed after cancel')
})

test('csm - cancel non-QUEUED command returns false', async (t) => {
  const bee = await createTestBee(t)
  const csm = createCSM(bee.sub('wal'))

  await csm.enqueue({ deviceId: 'wm001', command: 'reboot', params: {}, requesterId: 'test' })
  const cancelled = await csm.cancel('nonexistent')
  t.absent(cancelled, 'cannot cancel nonexistent command')
})

test('csm - recover re-queues EXECUTING commands', async (t) => {
  const bee = await createTestBee(t)
  const walStore = bee.sub('wal')

  const csm1 = createCSM(walStore)
  await csm1.wal.append('cmd-crashed', {
    state: COMMAND_STATES.EXECUTING,
    deviceId: 'wm001',
    command: 'reboot',
    params: {},
    retries: 2,
    createdAt: Date.now()
  })

  const csm2 = createCSM(walStore)
  await csm2.recover()

  const state = await csm2.getState('cmd-crashed')
  t.ok(state)
  t.is(state.state, COMMAND_STATES.QUEUED, 'EXECUTING → re-queued')
  t.is(state.retries, 1, 'retries decremented during recovery')
})

test('csm - recover re-queues TIMEOUT commands', async (t) => {
  const bee = await createTestBee(t)
  const walStore = bee.sub('wal')

  const csm1 = createCSM(walStore)
  await csm1.wal.append('cmd-timeout', {
    state: COMMAND_STATES.TIMEOUT,
    deviceId: 'wm001',
    command: 'reboot',
    params: {},
    retries: 1,
    createdAt: Date.now()
  })

  const csm2 = createCSM(walStore)
  await csm2.recover()

  const state = await csm2.getState('cmd-timeout')
  t.ok(state)
  t.is(state.state, COMMAND_STATES.QUEUED, 'TIMEOUT → re-queued on recovery')
  t.is(state.retries, 0, 'retries decremented')
})

test('csm - recover marks exhausted commands FAILED', async (t) => {
  const bee = await createTestBee(t)
  const walStore = bee.sub('wal')

  const csm1 = createCSM(walStore)
  await csm1.wal.append('cmd-exhausted', {
    state: COMMAND_STATES.EXECUTING,
    deviceId: 'wm001',
    command: 'reboot',
    params: {},
    retries: 0,
    createdAt: Date.now()
  })

  const csm2 = createCSM(walStore)
  await csm2.recover()

  const walEntry = await csm2.wal.get('cmd-exhausted')
  t.ok(walEntry)
  t.is(walEntry.state, COMMAND_STATES.FAILED, 'EXECUTING with 0 retries → FAILED')
  t.is(walEntry.error, 'ERR_RECOVERY_EXHAUSTED')
})

test('csm - recover cleans terminal entries', async (t) => {
  const bee = await createTestBee(t)
  const walStore = bee.sub('wal')

  const csm1 = createCSM(walStore)
  await csm1.wal.append('cmd-done', {
    state: COMMAND_STATES.SUCCESS,
    deviceId: 'wm001',
    command: 'reboot',
    params: {},
    retries: 0,
    createdAt: Date.now()
  })

  const csm2 = createCSM(walStore)
  await csm2.recover()

  const walEntry = await csm2.wal.get('cmd-done')
  t.absent(walEntry, 'SUCCESS entry compacted during recovery')
})

test('csm - drain clears all commands from memory', async (t) => {
  const bee = await createTestBee(t)
  const csm = createCSM(bee.sub('wal'), { noWorker: true })

  await csm.enqueue({ deviceId: 'wm001', command: 'reboot', params: {}, requesterId: 'test' })
  await new Promise(resolve => setImmediate(resolve))

  await csm.drain()
  t.is(csm._commands.size, 0, 'all commands cleared from memory')
})

test('csm - drain marks EXECUTING command TIMEOUT in WAL with ERR_ORK_SHUTDOWN', async (t) => {
  const bee = await createTestBee(t)
  const walStore = bee.sub('wal')
  const csm = createCSM(walStore)

  // Inject an EXECUTING entry directly into the CSM
  const entry = {
    state: COMMAND_STATES.EXECUTING,
    deviceId: 'wm001',
    command: 'reboot',
    params: {},
    retries: 2,
    createdAt: Date.now()
  }
  csm._commands.set('cmd-exec', entry)
  await csm.wal.append('cmd-exec', entry)

  await csm.drain()

  const walEntry = await csm.wal.get('cmd-exec')
  t.ok(walEntry, 'WAL entry persisted')
  t.is(walEntry.state, COMMAND_STATES.TIMEOUT, 'EXECUTING → TIMEOUT on drain')
  t.is(walEntry.error, 'ERR_ORK_SHUTDOWN', 'error set to ERR_ORK_SHUTDOWN')
  t.is(csm._commands.size, 0, 'commands cleared')
})

test('csm - drain marks DISPATCHED command TIMEOUT in WAL', async (t) => {
  const bee = await createTestBee(t)
  const walStore = bee.sub('wal')
  const csm = createCSM(walStore)

  const entry = {
    state: COMMAND_STATES.DISPATCHED,
    deviceId: 'wm001',
    command: 'setPowerMode',
    params: { mode: 'low' },
    retries: 1,
    createdAt: Date.now()
  }
  csm._commands.set('cmd-disp', entry)
  await csm.wal.append('cmd-disp', entry)

  await csm.drain()

  const walEntry = await csm.wal.get('cmd-disp')
  t.is(walEntry.state, COMMAND_STATES.TIMEOUT, 'DISPATCHED → TIMEOUT on drain')
  t.is(walEntry.error, 'ERR_ORK_SHUTDOWN')
})

test('csm - drain does not overwrite QUEUED entry in WAL', async (t) => {
  const bee = await createTestBee(t)
  const walStore = bee.sub('wal')
  const csm = createCSM(walStore, { noWorker: true })

  const commandId = await csm.enqueue({ deviceId: 'wm001', command: 'reboot', params: {}, requesterId: 'test' })
  await new Promise(resolve => setImmediate(resolve))

  await csm.drain()

  const walEntry = await csm.wal.get(commandId)
  t.ok(walEntry, 'QUEUED WAL entry survives drain')
  t.is(walEntry.state, COMMAND_STATES.QUEUED, 'QUEUED state preserved for next recover()')
})

test('csm - _dispatch on draining CSM exits without WAL write', async (t) => {
  const bee = await createTestBee(t)
  const walStore = bee.sub('wal')

  let sendCalled = false
  const csm = createCSM(walStore, {
    sendFn: async () => {
      sendCalled = true
      return { payload: { status: 'SUCCESS', result: {} } }
    }
  })

  csm._draining = true

  const entry = {
    state: COMMAND_STATES.QUEUED,
    deviceId: 'wm001',
    command: 'reboot',
    params: {},
    retries: 3,
    createdAt: Date.now()
  }
  csm._commands.set('cmd-drain', entry)
  await csm.wal.append('cmd-drain', entry)

  await csm._dispatch('cmd-drain', entry)

  t.absent(sendCalled, 'workerChannel.send not called when draining')
  const walEntry = await csm.wal.get('cmd-drain')
  t.is(walEntry.state, COMMAND_STATES.QUEUED, 'WAL entry unchanged — dispatch bailed immediately')
})

test('csm - drain sets _draining flag', async (t) => {
  const bee = await createTestBee(t)
  const csm = createCSM(bee.sub('wal'))

  t.absent(csm._draining, 'not draining before drain()')
  await csm.drain()
  t.ok(csm._draining, '_draining set after drain()')
})
