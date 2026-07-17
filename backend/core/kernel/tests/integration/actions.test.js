'use strict'

const test = require('brittle')
const crypto = require('crypto')
const fs = require('fs')
const os = require('os')
const path = require('path')
const createTestnet = require('hyperdht/testnet')
const HyperswarmRPC = require('@hyperswarm/rpc')
const { createKernel } = require('../../index')
const WorkerRuntime = require('../../../mdk-worker/lib/worker-runtime')
const actionsPlugin = require('../fixtures/actions-plugin')
const { ACTIONS, MESSAGE_TYPES } = require('../../lib/protocol/actions')
const { build: buildEnvelope, serialize, deserialize } = require('../../lib/protocol/envelope')

const ACTION_EXEC_INTERVAL_MS = 100

// Device state plus the worker-infra services the runtime serves builtins
// from: `actions` answers WRITE_CALLS_REQUEST, `provisioning` backs the
// updateThing builtin (its contract entry is merged into the published
// capabilities). Command handlers record into the shared `applied` array.
function createFleet ({ rebootReqVotes = 1 } = {}) {
  const applied = []
  const state = { reqVotes: rebootReqVotes }
  const things = {
    wm001: { id: 'wm001', type: 'miner-wm-m56s', tags: ['whatsminer'], info: { serialNum: 'WM001' } },
    wm002: { id: 'wm002', type: 'miner-wm-m56s', tags: ['whatsminer'], info: { serialNum: 'WM002' } }
  }

  const services = {
    actions: {
      getWriteCalls ({ query = {}, rackActionId = null } = {}) {
        if (rackActionId) {
          return {
            calls: [{ id: rackActionId, tags: [] }],
            reqVotes: state.reqVotes
          }
        }

        let matched = Object.values(things)
        if (query.id) matched = matched.filter(t => t.id === query.id)
        return {
          calls: matched.map(t => ({ id: t.id, tags: t.tags || [] })),
          reqVotes: state.reqVotes
        }
      }
    },
    provisioning: {
      async updateThing (params) {
        const thing = things[params.id]
        if (thing) {
          thing.info = thing.info || {}
          if (params.info) Object.assign(thing.info, params.info)
        }
        applied.push({ method: 'updateThing', params })
        return { ...params, updatedAt: Date.now() }
      }
    }
  }

  return {
    things,
    applied,
    services,
    devices: Object.values(things).map(t => ({
      deviceId: t.id,
      config: { state: { id: t.id, applied } }
    }))
  }
}

function createTmpDir (t) {
  const tmpDir = path.join(os.tmpdir(), `mdk-kernel-actions-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  fs.mkdirSync(path.join(tmpDir, 'config'), { recursive: true })
  fs.mkdirSync(path.join(tmpDir, 'store'), { recursive: true })
  t.teardown(() => fs.rmSync(tmpDir, { recursive: true, force: true }))
  return tmpDir
}

async function waitForReadyWorker (registry, attempts = 60) {
  for (let i = 0; i < attempts; i++) {
    const ready = registry.listWorkers().filter(w => w.state === 'READY')
    if (ready.length > 0) return ready
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  return []
}

async function requestKernel (clientRpc, orkPublicKey, action, payload) {
  const envelope = buildEnvelope({
    action,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'test:client:actions',
    payload: payload || {}
  })
  const resBuf = await clientRpc.request(orkPublicKey, 'mdk', serialize(envelope))
  return deserialize(resBuf)
}

function waitForCommandDone (kernel, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('ERR_TEST_COMMAND_TIMEOUT')), timeoutMs)
    kernel.stateMachine.once('command:done', (data) => {
      clearTimeout(timer)
      resolve(data)
    })
  })
}

function assertKernelError (t, result, code, message) {
  t.ok(result.error, message || `expected Kernel error ${code}`)
  t.ok(result.error.includes(code), `expected ${code} in ${result.error}`)
}

function assertPushRejected (t, result, message) {
  t.is(result.id, null, message || 'push returns no action id')
  t.ok(result.errors.includes('ERR_KERNEL_ACTION_CALLS_EMPTY'), 'reports empty write calls')
}

async function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function setupActionsFixture (t, opts = {}) {
  const testnet = await createTestnet(3, t.teardown)
  const bootstrap = testnet.bootstrap
  const topic = crypto.randomBytes(32)
  const tmpDir = createTmpDir(t)
  const fleet = createFleet(opts)

  // ─── Worker side ────────────────────────────────────────────────
  const runtime = new WorkerRuntime(actionsPlugin, {
    workerId: 'wm-rack-1',
    kernelTopic: topic.toString('hex'),
    bootstrap,
    devices: fleet.devices,
    services: fleet.services
  })
  await runtime.start()

  t.teardown(async () => {
    await runtime.stop()
  })

  // ─── Kernel side ───────────────────────────────────────────────────
  const kernel = createKernel({
    db: path.join(tmpDir, 'store'),
    root: tmpDir,
    listeners: { hrpc: { whitelist: [], bootstrap } },
    discovery: { topic: topic.toString('hex') },
    actions: { actionIntvlMs: opts.actionIntvlMs ?? ACTION_EXEC_INTERVAL_MS },
    cadences: { telemetryPullMs: 60000, healthPingMs: 60000, statePullMs: 60000 }
  })

  await kernel.init()
  await kernel.start()

  const ready = await waitForReadyWorker(kernel.registry)
  if (!ready.length) throw new Error('ERR_TEST_WORKER_NOT_READY')

  const orkPublicKey = kernel.getPublicKey()
  const clientRpc = new HyperswarmRPC({ bootstrap })
  t.teardown(async () => {
    await clientRpc.destroy()
    await kernel.stop()
  })

  return { kernel, fleet, clientRpc, orkPublicKey, bootstrap }
}

test('actions - pushAction resolves write calls and stores action', async (t) => {
  const { clientRpc, orkPublicKey } = await setupActionsFixture(t)

  const result = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_PUSH, {
    query: { id: 'wm001' },
    action: 'reboot',
    params: [],
    voter: 'operator@test',
    authPerms: ['miner:w']
  })

  t.ok(result.id, 'returns action id')
  t.is(result.errors.length, 0, 'no validation errors')

  const stored = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_GET, {
    id: result.id,
    type: 'ready'
  })
  t.is(stored.action, 'reboot')
  t.is(stored.status, 'APPROVED')
  t.ok(stored.targets['wm-rack-1'], 'targets include worker')
  t.is(stored.targets['wm-rack-1'].calls.length, 1)
  t.is(stored.targets['wm-rack-1'].calls[0].id, 'wm001')
})

test('actions - approved reboot executes through command dispatcher', async (t) => {
  const { kernel, fleet, clientRpc, orkPublicKey } = await setupActionsFixture(t)

  const doneP = waitForCommandDone(kernel)

  const pushRes = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_PUSH, {
    query: { id: 'wm001' },
    action: 'reboot',
    params: [],
    voter: 'operator@test',
    authPerms: ['miner:w']
  })

  const done = await doneP
  t.is(done.state, 'SUCCESS', 'command completes successfully')
  t.is(done.result, 1, 'reboot applied to target miner')
  t.alike(fleet.applied, [{ method: 'reboot', thingIds: ['wm001'] }], 'reboot handler ran for the target device only')

  const completed = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_QUERY, {
    queries: [{ type: 'done' }]
  })
  const finished = completed.done.find(action => action.id === pushRes.id)
  t.ok(finished, 'action recorded in done')
  t.is(finished.status, 'COMPLETED')
  t.ok(finished.targets['wm-rack-1'].calls[0].commandId, 'call records dispatcher command id')
})

test('actions - voteAction approves multi-vote action', async (t) => {
  const { clientRpc, orkPublicKey } = await setupActionsFixture(t, { rebootReqVotes: 2 })

  const pushRes = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_PUSH, {
    query: { id: 'wm001' },
    action: 'reboot',
    params: [],
    voter: 'operator@test',
    authPerms: ['miner:w']
  })

  let stored = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_GET, {
    id: pushRes.id,
    type: 'voting'
  })
  t.is(stored.status, 'VOTING')

  await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_VOTE, {
    id: pushRes.id,
    voter: 'approver@test',
    approve: true,
    authPerms: ['miner:w']
  })

  stored = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_GET, {
    id: pushRes.id,
    type: 'ready'
  })
  t.is(stored.status, 'APPROVED')
  t.alike(stored.votesPos, ['operator@test', 'approver@test'])
})

test('actions - voteAction rejects action on negative vote', async (t) => {
  const { fleet, clientRpc, orkPublicKey } = await setupActionsFixture(t, { rebootReqVotes: 2 })

  const pushRes = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_PUSH, {
    query: { id: 'wm001' },
    action: 'reboot',
    params: [],
    voter: 'operator@test',
    authPerms: ['miner:w']
  })

  let stored = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_GET, {
    id: pushRes.id,
    type: 'voting'
  })
  t.is(stored.status, 'VOTING')

  await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_VOTE, {
    id: pushRes.id,
    voter: 'rejecter@test',
    approve: false,
    authPerms: ['miner:w']
  })

  stored = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_GET, {
    id: pushRes.id,
    type: 'done'
  })
  t.is(stored.status, 'DENIED', 'negative vote rejects the action')
  t.alike(stored.votesNeg, ['rejecter@test'])

  const open = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_QUERY, {
    queries: [{ type: 'voting' }, { type: 'ready' }]
  })
  t.is(open.voting.filter(action => action.id === pushRes.id).length, 0, 'removed from voting')
  t.is(open.ready.filter(action => action.id === pushRes.id).length, 0, 'not promoted to ready')
  t.is(fleet.applied.length, 0, 'rejected action is not executed')
})

test('actions - pushActionsBatch stamps batchActionUID with suffix', async (t) => {
  const { clientRpc, orkPublicKey } = await setupActionsFixture(t, { actionIntvlMs: 600000 })

  const results = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_PUSH_BATCH, {
    batchActionsPayload: [
      { query: { id: 'wm001' }, action: 'reboot', params: [] },
      { query: { id: 'wm002' }, action: 'reboot', params: [] }
    ],
    batchActionUID: 'repair-batch',
    suffix: 'site-a',
    voter: 'operator@test',
    authPerms: ['miner:w']
  })

  t.is(results.length, 2)
  t.ok(results[0].id)
  t.ok(results[1].id)

  const first = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_GET, {
    id: results[0].id,
    type: 'ready'
  })
  const second = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_GET, {
    id: results[1].id,
    type: 'ready'
  })

  t.is(first.batchActionUID, second.batchActionUID, 'shared batch uid')
  t.ok(first.batchActionUID.endsWith('-site-a'), 'suffix appended to batch uid')
  t.ok(first.batchActionUID.includes('repair-batch'), 'batch uid retains client id')
})

test('actions - queryActions filters by suffix', async (t) => {
  const { clientRpc, orkPublicKey } = await setupActionsFixture(t, { actionIntvlMs: 600000 })
  const since = Date.now()

  await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_PUSH_BATCH, {
    batchActionsPayload: [{ query: { id: 'wm001' }, action: 'reboot', params: [] }],
    batchActionUID: 'batch-a',
    suffix: 'site-a',
    voter: 'operator@test',
    authPerms: ['miner:w']
  })
  await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_PUSH_BATCH, {
    batchActionsPayload: [{ query: { id: 'wm002' }, action: 'reboot', params: [] }],
    batchActionUID: 'batch-b',
    suffix: 'site-b',
    voter: 'operator@test',
    authPerms: ['miner:w']
  })

  const all = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_QUERY, {
    queries: [{ type: 'ready', filter: { gte: since - 1000 } }]
  })
  t.is(all.ready.length, 2, 'returns both actions without suffix filter')

  const filtered = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_QUERY, {
    queries: [{ type: 'ready', filter: { gte: since - 1000 } }],
    suffix: '-site-a'
  })
  t.is(filtered.ready.length, 1, 'suffix filter keeps matching batch only')
  t.ok(filtered.ready[0].batchActionUID.endsWith('-site-a'))
})

test('actions - getAction, vote, and cancel lifecycle', async (t) => {
  const { clientRpc, orkPublicKey } = await setupActionsFixture(t, { rebootReqVotes: 2 })

  const pushRes = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_PUSH, {
    query: { id: 'wm001' },
    action: 'reboot',
    params: [],
    voter: 'operator@test',
    authPerms: ['miner:w']
  })

  const fetched = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_GET, {
    id: pushRes.id,
    type: 'voting'
  })
  t.is(fetched.id, pushRes.id)
  t.ok(fetched.targets['wm-rack-1'])

  const batchFetched = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_GET_BATCH, {
    ids: [pushRes.id]
  })
  t.is(batchFetched.length, 1)
  t.is(batchFetched[0].type, 'voting')

  const voteRes = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_VOTE, {
    id: pushRes.id,
    voter: 'approver@test',
    approve: false,
    authPerms: ['miner:w']
  })
  t.is(voteRes, 1)

  const cancelled = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_CANCEL_BATCH, {
    ids: [pushRes.id],
    voter: 'operator@test'
  })
  t.ok(Array.isArray(cancelled))
})

test('actions - rackReboot resolves rack-level target and dispatches rack scope', async (t) => {
  const { kernel, fleet, clientRpc, orkPublicKey } = await setupActionsFixture(t)

  const doneP = waitForCommandDone(kernel)

  const pushRes = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_PUSH, {
    query: {},
    action: 'rackReboot',
    params: [],
    voter: 'operator@test',
    authPerms: ['miner:w']
  })

  t.ok(pushRes.id, 'returns action id')
  t.is(pushRes.errors.length, 0, 'no validation errors')

  // The kernel resolves the rack-level target and dispatches a RACK-scoped
  // command (no deviceId). WorkerRuntime serves plugin commands per-device
  // only, so the worker reports FAILED and the kernel records that verdict —
  // rackReboot has no runtime-worker implementation since the adapter's
  // retirement.
  const done = await doneP
  t.is(done.state, 'FAILED', 'runtime worker rejects the rack-scoped command')
  t.ok(done.error.includes('ERR_DEVICE_ID_REQUIRED'), 'worker error is surfaced to the kernel')
  t.is(fleet.applied.length, 0, 'no device handler ran')

  const completed = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_QUERY, {
    queries: [{ type: 'done' }]
  })
  const finished = completed.done.find(action => action.id === pushRes.id)
  t.ok(finished, 'action recorded in done')
  t.is(finished.action, 'rackReboot')
  t.is(finished.targets['wm-rack-1'].calls.length, 1, 'single rack-level call')
  t.is(finished.targets['wm-rack-1'].calls[0].id, 'wm-rack-1', 'call id is worker rack id')
  t.ok(finished.targets['wm-rack-1'].calls[0].commandId, 'kernel-side dispatch succeeded')
})

test('actions - updateThing rack action scopes to matching worker', async (t) => {
  const { kernel, fleet, clientRpc, orkPublicKey } = await setupActionsFixture(t)

  const doneP = waitForCommandDone(kernel)

  const pushRes = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_PUSH, {
    query: {},
    action: 'updateThing',
    params: [{ workerId: 'wm-rack-1', id: 'wm001', info: { serialNum: 'WM001-UPDATED' } }],
    voter: 'operator@test',
    authPerms: ['miner:w']
  })

  t.ok(pushRes.id, 'returns action id')
  t.is(pushRes.errors.length, 0, 'no validation errors')

  const done = await doneP
  t.is(done.state, 'SUCCESS', 'updateThing rack command completes')
  t.is(fleet.things.wm001.info.serialNum, 'WM001-UPDATED')

  const completed = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_QUERY, {
    queries: [{ type: 'done' }]
  })
  const finished = completed.done.find(action => action.id === pushRes.id)
  t.ok(finished, 'action recorded in done')
  t.is(finished.action, 'updateThing')
  t.is(finished.targets['wm-rack-1'].calls[0].id, 'wm001', 'rack action id scopes to thing')
})

test('actions - pushAction rejects query with no matching devices', async (t) => {
  const { clientRpc, orkPublicKey } = await setupActionsFixture(t)

  const result = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_PUSH, {
    query: { id: 'missing-miner' },
    action: 'reboot',
    params: [],
    voter: 'operator@test',
    authPerms: ['miner:w']
  })

  assertPushRejected(t, result, 'unknown device yields no write calls')
})

test('actions - pushAction rejects caller without write permission', async (t) => {
  const { clientRpc, orkPublicKey } = await setupActionsFixture(t)

  const result = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_PUSH, {
    query: { id: 'wm001' },
    action: 'reboot',
    params: [],
    voter: 'operator@test',
    authPerms: ['miner:r']
  })

  assertPushRejected(t, result, 'read-only permission cannot push actions')
})

test('actions - pushAction rejects invalid query payload', async (t) => {
  const { clientRpc, orkPublicKey } = await setupActionsFixture(t)

  const result = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_PUSH, {
    query: null,
    action: 'reboot',
    params: [],
    voter: 'operator@test',
    authPerms: ['miner:w']
  })

  assertKernelError(t, result, 'ERR_QUERY_INVALID')
})

test('actions - pushAction rejects non-array params', async (t) => {
  const { clientRpc, orkPublicKey } = await setupActionsFixture(t)

  const result = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_PUSH, {
    query: { id: 'wm001' },
    action: 'reboot',
    params: { mode: 'high' },
    voter: 'operator@test',
    authPerms: ['miner:w']
  })

  assertKernelError(t, result, 'ERR_PARAMS_INVALID')
})

test('actions - pushAction rejects blank action name', async (t) => {
  const { clientRpc, orkPublicKey } = await setupActionsFixture(t)

  const result = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_PUSH, {
    query: { id: 'wm001' },
    action: '   ',
    params: [],
    voter: 'operator@test',
    authPerms: ['miner:w']
  })

  assertKernelError(t, result, 'ERR_ACTION_INVALID')
})

test('actions - pushAction rejects rack action missing worker id', async (t) => {
  const { clientRpc, orkPublicKey } = await setupActionsFixture(t)

  const result = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_PUSH, {
    query: {},
    action: 'updateThing',
    params: [{ id: 'wm001', info: { serialNum: 'BAD' } }],
    voter: 'operator@test',
    authPerms: ['miner:w']
  })

  assertPushRejected(t, result, 'invalid rack action params produce no calls')
})

test('actions - pushActionsBatch rejects non-array payload', async (t) => {
  const { clientRpc, orkPublicKey } = await setupActionsFixture(t)

  const result = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_PUSH_BATCH, {
    batchActionsPayload: 'not-an-array',
    voter: 'operator@test',
    authPerms: ['miner:w']
  })

  assertKernelError(t, result, 'ERR_PAYLOAD_INVALID')
})

test('actions - getAction rejects unknown action id', async (t) => {
  const { clientRpc, orkPublicKey } = await setupActionsFixture(t)

  const result = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_GET, {
    id: 999999999,
    type: 'voting'
  })

  assertKernelError(t, result, 'ERR_ACTION_ID_NOT_FOUND')
})

test('actions - getActionsBatch ignores unknown ids', async (t) => {
  const { clientRpc, orkPublicKey } = await setupActionsFixture(t)

  const result = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_GET_BATCH, {
    ids: [999999998, 999999999]
  })

  t.alike(result, [], 'unknown ids produce no entries')
})

test('actions - voteAction rejects missing permissions', async (t) => {
  const { clientRpc, orkPublicKey } = await setupActionsFixture(t, { rebootReqVotes: 2 })

  const pushRes = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_PUSH, {
    query: { id: 'wm001' },
    action: 'reboot',
    params: [],
    voter: 'operator@test',
    authPerms: ['miner:w']
  })

  const result = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_VOTE, {
    id: pushRes.id,
    voter: 'approver@test',
    approve: true,
    authPerms: ['container:w']
  })

  assertKernelError(t, result, 'ERR_ACTION_DENIED')
})

test('actions - voteAction rejects duplicate voter', async (t) => {
  const { clientRpc, orkPublicKey } = await setupActionsFixture(t, { rebootReqVotes: 2 })

  const pushRes = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_PUSH, {
    query: { id: 'wm001' },
    action: 'reboot',
    params: [],
    voter: 'operator@test',
    authPerms: ['miner:w']
  })

  const result = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_VOTE, {
    id: pushRes.id,
    voter: 'operator@test',
    approve: true,
    authPerms: ['miner:w']
  })

  assertKernelError(t, result, 'ERR_VOTER_EXISTS')
})

test('actions - voteAction rejects vote on missing action', async (t) => {
  const { clientRpc, orkPublicKey } = await setupActionsFixture(t)

  const result = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_VOTE, {
    id: 999999999,
    voter: 'approver@test',
    approve: true,
    authPerms: ['miner:w']
  })

  assertKernelError(t, result, 'ERR_ACTION_ID_NOT_FOUND')
})

test('actions - cancelActionsBatch rejects non-creator voter', async (t) => {
  const { clientRpc, orkPublicKey } = await setupActionsFixture(t, { rebootReqVotes: 2 })

  const pushRes = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_PUSH, {
    query: { id: 'wm001' },
    action: 'reboot',
    params: [],
    voter: 'operator@test',
    authPerms: ['miner:w']
  })

  const cancelled = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_CANCEL_BATCH, {
    ids: [pushRes.id],
    voter: 'intruder@test'
  })

  t.ok(Array.isArray(cancelled))
  t.is(cancelled[0].success, false)
  t.ok(cancelled[0].error.includes('ERR_CALLER_NOT_CREATOR'))
})

test('actions - queryActions rejects invalid queries payload', async (t) => {
  const { clientRpc, orkPublicKey } = await setupActionsFixture(t)

  const invalidQueries = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_QUERY, {
    queries: 'not-an-array'
  })
  assertKernelError(t, invalidQueries, 'ERR_QUERIES_INVALID')

  const missingType = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_QUERY, {
    queries: [{}]
  })
  assertKernelError(t, missingType, 'ERR_QUERIES_TYPE_INVALID')
})

test('actions - denied action is not executed by action interval', async (t) => {
  const { fleet, clientRpc, orkPublicKey } = await setupActionsFixture(t, { rebootReqVotes: 2 })

  const pushRes = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_PUSH, {
    query: { id: 'wm001' },
    action: 'reboot',
    params: [],
    voter: 'operator@test',
    authPerms: ['miner:w']
  })

  await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_VOTE, {
    id: pushRes.id,
    voter: 'rejecter@test',
    approve: false,
    authPerms: ['miner:w']
  })

  await sleep(ACTION_EXEC_INTERVAL_MS * 3)

  t.is(fleet.applied.length, 0, 'denied action never reaches worker commands')

  const ready = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_QUERY, {
    queries: [{ type: 'ready' }]
  })
  t.is(ready.ready.filter(action => action.id === pushRes.id).length, 0)
})
