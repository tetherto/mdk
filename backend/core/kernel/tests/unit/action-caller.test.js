'use strict'

const test = require('brittle')
const { ACTIONS } = require('../../lib/protocol/actions')
const { ActionCaller } = require('../../lib/modules/action-caller')
const { WORKER_WRITE_ACTION_TYPES } = require('../../lib/modules/action-caller/constants')

function createRegistry (workers = []) {
  return {
    getReadyWorkers: () => workers,
    resolveWorkerForDevice (deviceId) {
      for (const worker of workers) {
        if (worker.deviceIds && worker.deviceIds.includes(deviceId)) {
          return { workerId: worker.workerId, channel: worker.channel }
        }
      }
      return null
    }
  }
}

function createDispatcherHarness (opts = {}) {
  const dispatched = []
  const dispatcher = {
    dispatch: async (envelope) => {
      dispatched.push(envelope)
      if (opts.onDispatch) return opts.onDispatch(envelope)
      return { commandId: 'cmd-1', status: 'QUEUED' }
    }
  }
  return { dispatched, dispatcher }
}

function createCaller (opts = {}) {
  const sent = []
  const workers = opts.workers || []
  const registry = createRegistry(workers)
  const workerChannel = {
    send: async (channel, envelope) => {
      sent.push({ channel, envelope })
      if (opts.onSend) return opts.onSend({ channel, envelope })
      return opts.response || {
        payload: { calls: [{ id: 'dev-1', tags: [] }], reqVotes: 1 }
      }
    }
  }
  const harness = createDispatcherHarness(opts)
  const caller = new ActionCaller({
    registry,
    workerChannel,
    dispatcher: harness.dispatcher,
    ...opts.callerOpts
  })
  return { caller, sent, dispatched: harness.dispatched }
}

test('action caller - getWriteCalls rejects invalid input', async (t) => {
  const { caller } = createCaller()

  await t.exception(
    () => caller.getWriteCalls(null, 'reboot', [], ['miner:w']),
    /ERR_QUERY_INVALID/
  )
  await t.exception(
    () => caller.getWriteCalls({ id: 'dev-1' }, '', [], ['miner:w']),
    /ERR_ACTION_INVALID/
  )
  await t.exception(
    () => caller.getWriteCalls({ id: 'dev-1' }, 'reboot', {}, ['miner:w']),
    /ERR_PARAMS_INVALID/
  )
})

test('action caller - getWriteCalls skips workers without write permission', async (t) => {
  const { caller, sent } = createCaller({
    workers: [{ workerId: 'miner-worker', deviceFamily: 'miner', channel: { id: 'ch-1' } }]
  })

  const result = await caller.getWriteCalls(
    { id: 'dev-1' },
    'reboot',
    [],
    ['container:w']
  )

  t.is(sent.length, 0)
  t.alike(result.targets, {})
})

test('action caller - getWriteCalls skips workers without a channel', async (t) => {
  const { caller, sent } = createCaller({
    workers: [{ workerId: 'miner-worker', deviceFamily: 'miner' }]
  })

  const result = await caller.getWriteCalls(
    { id: 'dev-1' },
    'reboot',
    [],
    ['miner:w']
  )

  t.is(sent.length, 0)
  t.alike(result.targets, {})
})

test('action caller - getWriteCalls contacts ready workers with write permission', async (t) => {
  const { caller, sent } = createCaller({
    workers: [{ workerId: 'miner-worker', deviceFamily: 'miner', channel: { id: 'ch-1' } }]
  })

  const result = await caller.getWriteCalls(
    { id: 'dev-1' },
    'reboot',
    [],
    ['miner:w']
  )

  t.is(sent.length, 1)
  t.ok(result.targets['miner-worker'])
  t.alike(result.requiredPerms, ['miner'])
})

test('action caller - getWriteCalls resolves write calls from ready workers', async (t) => {
  const channel = { id: 'ch-1' }
  const { caller, sent } = createCaller({
    workers: [{ workerId: 'miner-worker', deviceFamily: 'miner', channel }]
  })

  const result = await caller.getWriteCalls(
    { tags: { $in: ['rack-a'] } },
    'reboot',
    [{ mode: 'high' }],
    ['miner:w']
  )

  t.is(sent.length, 1)
  t.is(sent[0].channel, channel)
  t.is(sent[0].envelope.action, ACTIONS.WRITE_CALLS_REQUEST)
  t.is(sent[0].envelope.target, 'miner-worker')
  t.alike(sent[0].envelope.payload, {
    query: { tags: { $in: ['rack-a'] } },
    action: 'reboot',
    params: [{ mode: 'high' }],
    rackActionId: undefined
  })
  t.alike(result.targets['miner-worker'].calls, [{ id: 'dev-1', tags: [] }])
  t.is(result.targets['miner-worker'].reqVotes, 1)
})

test('action caller - getWriteCalls records rack validation errors per worker', async (t) => {
  const { caller } = createCaller({
    workers: [{ workerId: 'rack-1', deviceFamily: 'thing', channel: { id: 'ch-1' } }]
  })

  const missingWorkerId = await caller.getWriteCalls(
    {},
    WORKER_WRITE_ACTION_TYPES.REGISTER_THING,
    [{}],
    ['thing:w']
  )
  t.is(missingWorkerId.targets['rack-1'].error, 'ERR_ACTION_INVALID_MISSING_WORKER_ID')

  const missingId = await caller.getWriteCalls(
    {},
    WORKER_WRITE_ACTION_TYPES.UPDATE_THING,
    [{ workerId: 'rack-1' }],
    ['thing:w']
  )
  t.is(missingId.targets['rack-1'].error, 'ERR_ACTION_INVALID_MISSING_ID')

  const missingQueryId = await caller.getWriteCalls(
    {},
    WORKER_WRITE_ACTION_TYPES.FORGET_THINGS,
    [{ workerId: 'rack-1', query: {} }],
    ['thing:w']
  )
  t.is(missingQueryId.targets['rack-1'].error, 'ERR_ACTION_INVALID_QUERY_ID')
})

test('action caller - getWriteCalls scopes rack actions to matching worker', async (t) => {
  const { caller, sent } = createCaller({
    workers: [
      { workerId: 'rack-1', deviceFamily: 'thing', channel: { id: 'ch-1' } },
      { workerId: 'rack-2', deviceFamily: 'thing', channel: { id: 'ch-2' } }
    ]
  })

  await caller.getWriteCalls(
    {},
    WORKER_WRITE_ACTION_TYPES.UPDATE_THING,
    [{ workerId: 'rack-1', id: 'thing-1' }],
    ['thing:w']
  )

  t.is(sent.length, 1)
  t.is(sent[0].envelope.target, 'rack-1')
  t.is(sent[0].envelope.payload.rackActionId, 'thing-1')
})

test('action caller - callTargets dispatches commands and records command ids', async (t) => {
  const { caller, dispatched } = createCaller({
    workers: [{
      workerId: 'miner-worker',
      deviceFamily: 'miner',
      channel: { id: 'ch-1' },
      deviceIds: ['dev-1']
    }],
    onDispatch: async () => ({ commandId: 'cmd-42', status: 'QUEUED' })
  })

  const targets = {
    'miner-worker': {
      calls: [{ id: 'dev-1', tags: [] }]
    }
  }

  await caller.callTargets('reboot', [{ mode: 'high' }], targets)

  t.is(dispatched.length, 1)
  t.is(dispatched[0].action, ACTIONS.COMMAND_REQUEST)
  t.is(dispatched[0].deviceId, 'dev-1')
  t.alike(dispatched[0].payload, {
    command: 'reboot',
    params: { mode: 'high' },
    requesterId: 'kernel:kernel:default'
  })
  t.is(targets['miner-worker'].calls[0].commandId, 'cmd-42')
})

test('action caller - callTargets records dispatcher rejections on calls', async (t) => {
  const { caller } = createCaller({
    workers: [{
      workerId: 'miner-worker',
      deviceFamily: 'miner',
      channel: { id: 'ch-1' },
      deviceIds: ['dev-1']
    }],
    onDispatch: async () => ({ status: 'REJECTED', error: 'ERR_WORKER_NOT_ROUTABLE' })
  })

  const targets = {
    'miner-worker': { calls: [{ id: 'dev-1', tags: [] }] }
  }

  await caller.callTargets('reboot', [], targets)
  t.is(targets['miner-worker'].calls[0].error, 'ERR_WORKER_NOT_ROUTABLE')
})

test('action caller - formats rack action command params with action metadata', async (t) => {
  const { caller, dispatched } = createCaller({
    workers: [{
      workerId: 'rack-1',
      deviceFamily: 'thing',
      channel: { id: 'ch-1' }
    }]
  })

  const targets = { 'rack-1': { calls: [{ id: 'rack-1', tags: [] }] } }
  await caller.callTargets(
    WORKER_WRITE_ACTION_TYPES.REGISTER_THING,
    [{ name: 'sensor-a' }, { actionId: 99, user: 'user@example.com' }],
    targets
  )

  t.is(dispatched.length, 1)
  t.is(dispatched[0].deviceId, null)
  t.is(dispatched[0].payload.scope, 'worker')
  t.is(dispatched[0].payload.workerId, 'rack-1')
  t.alike(dispatched[0].payload.params, {
    name: 'sensor-a',
    actionId: 99,
    user: 'user@example.com'
  })
  t.is(targets['rack-1'].calls[0].commandId, 'cmd-1')
})
