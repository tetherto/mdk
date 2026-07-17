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

// reqVotes returned by getWriteCalls per action name
const ACTION_REQ_VOTES = {
  reboot: 1,
  setLED: 1,
  powerCycle: 2,
  factoryReset: 3
}

const ACTION_EXEC_INTERVAL_MS = 5000
const DEVICES_PER_WORKER = 10

// workers — WorkerRuntime over in-memory device state, no mock device server needed
const WORKER_CONFIGS = [
  { workerId: 'stress-wm-1', devicePrefix: 'wm1' },
  { workerId: 'stress-wm-2', devicePrefix: 'wm2' },
  { workerId: 'stress-wm-3', devicePrefix: 'wm3' },
  { workerId: 'stress-wm-4', devicePrefix: 'wm4' },
  { workerId: 'stress-wm-5', devicePrefix: 'wm5' }
]

// Derived timeouts — scale with the configured interval and device count so
// tests remain valid when ACTION_EXEC_INTERVAL_MS or DEVICES_PER_WORKER change.
//
// Per-round budget: covers the approver interval tick + DHT round-trips for
// 50 commands (one full worker set). Generous 10× multiplier so CI slowdowns
// don't flap.
const ROUND_TIMEOUT_MS = Math.max(60000, ACTION_EXEC_INTERVAL_MS * 10)

// Per-test budget: fixed setup overhead + 4 rounds (the heaviest test) each
// capped at ROUND_TIMEOUT_MS, plus an extra pad for push/vote RPC latency.
const TEST_TIMEOUT_MS = Math.max(10 * 60 * 1000, 60000 + 4 * ROUND_TIMEOUT_MS)

function deviceId (prefix, idx) {
  return `${prefix}-d${String(idx).padStart(2, '0')}`
}

// Device state plus the worker-infra services the runtime serves builtins
// from: `actions` answers WRITE_CALLS_REQUEST with per-action reqVotes,
// `provisioning` backs the updateThing builtin used by the rack round.
function createFleet (workerId, devicePrefix) {
  const applied = []
  const things = {}
  for (let i = 1; i <= DEVICES_PER_WORKER; i++) {
    const id = deviceId(devicePrefix, i)
    things[id] = {
      id,
      type: 'miner-stress',
      tags: ['stress'],
      info: { serialNum: `${devicePrefix.toUpperCase()}-${String(i).padStart(3, '0')}` }
    }
  }

  const services = {
    actions: {
      // action is passed in the WRITE_CALLS_REQUEST payload — use it to return per-action reqVotes
      getWriteCalls ({ query = {}, action, rackActionId = null } = {}) {
        if (rackActionId) return { calls: [{ id: rackActionId, tags: [] }], reqVotes: 1 }
        let matched = Object.values(things)
        if (query.id) matched = matched.filter(t => t.id === query.id)
        return {
          calls: matched.map(t => ({ id: t.id, tags: t.tags || [] })),
          reqVotes: ACTION_REQ_VOTES[action] || 1
        }
      }
    },
    provisioning: {
      async updateThing (params) {
        const thing = things[params.id]
        if (thing) Object.assign(thing.info, params.info || {})
        return { ...params, updatedAt: Date.now() }
      }
    }
  }

  return {
    things,
    services,
    devices: Object.values(things).map(t => ({
      deviceId: t.id,
      config: { state: { id: t.id, applied } }
    })),
    listThings () {
      return Object.values(things).map(t => ({ id: t.id, type: t.type, tags: t.tags, status: 'online' }))
    }
  }
}

function createTmpDir (t) {
  const tmpDir = path.join(os.tmpdir(), `kernel-stress-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  fs.mkdirSync(path.join(tmpDir, 'config'), { recursive: true })
  fs.mkdirSync(path.join(tmpDir, 'store'), { recursive: true })
  t.teardown(() => fs.rmSync(tmpDir, { recursive: true, force: true }))
  return tmpDir
}

async function waitForNReadyWorkers (registry, n, attempts = 120) {
  for (let i = 0; i < attempts; i++) {
    const ready = registry.listWorkers().filter(w => w.state === 'READY')
    if (ready.length >= n) return ready
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  throw new Error(`ERR_WORKERS_NOT_READY: expected ${n}`)
}

async function requestKernel (clientRpc, orkPublicKey, action, payload) {
  const envelope = buildEnvelope({
    action,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'test:stress:client',
    payload: payload || {}
  })
  const resBuf = await clientRpc.request(orkPublicKey, 'mdk', serialize(envelope))
  return deserialize(resBuf)
}

async function pushAction (clientRpc, orkPublicKey, { query, action, params, voter, authPerms }) {
  const result = await requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_PUSH, {
    query, action, params, voter, authPerms
  })
  if (!result.id) throw new Error(`ERR_ACTION_PUSH_FAILED: ${JSON.stringify(result.errors)}`)
  return result.id
}

async function voteAction (clientRpc, orkPublicKey, { id, voter, authPerms }) {
  return requestKernel(clientRpc, orkPublicKey, ACTIONS.ACTION_VOTE, {
    id,
    voter,
    approve: true,
    authPerms
  })
}

// Event-driven completion helper — listens on kernel.stateMachine rather than
// polling ACTION_QUERY. This fires immediately when each command completes,
// removing the polling delay and avoiding issues with large done-list payloads.
//
// IMPORTANT: call this BEFORE dispatching actions so that fast 1-vote commands
// cannot complete and emit their event before the listener is attached.
function waitForNCommandsDone (kernel, n, timeoutMs) {
  return new Promise((resolve, reject) => {
    let count = 0
    const timer = setTimeout(() => {
      kernel.stateMachine.removeListener('command:done', handler)
      reject(new Error(`ERR_TIMEOUT: ${count}/${n} commands done after ${timeoutMs}ms`))
    }, timeoutMs)
    function handler () {
      if (++count >= n) {
        clearTimeout(timer)
        kernel.stateMachine.removeListener('command:done', handler)
        resolve()
      }
    }
    kernel.stateMachine.on('command:done', handler)
  })
}

// ─── Shared fixture ─────────────────────────────────────────────────────────

async function setupStressFixture (t) {
  const testnet = await createTestnet(3, t.teardown)
  const bootstrap = testnet.bootstrap
  const topic = crypto.randomBytes(32)
  const tmpDir = createTmpDir(t)

  const fleets = await Promise.all(
    WORKER_CONFIGS.map(async ({ workerId, devicePrefix }) => {
      const fleet = createFleet(workerId, devicePrefix)
      const runtime = new WorkerRuntime(actionsPlugin, {
        workerId,
        kernelTopic: topic.toString('hex'),
        bootstrap,
        devices: fleet.devices,
        services: fleet.services
      })
      await runtime.start()
      t.teardown(async () => runtime.stop())
      return { workerId, fleet }
    })
  )

  const kernel = createKernel({
    db: path.join(tmpDir, 'store'),
    root: tmpDir,
    listeners: { hrpc: { whitelist: [], bootstrap } },
    discovery: { topic: topic.toString('hex') },
    actions: { actionIntvlMs: ACTION_EXEC_INTERVAL_MS },
    cadences: { telemetryPullMs: 60000, healthPingMs: 60000, statePullMs: 60000 }
  })

  await kernel.init()
  await kernel.start()
  t.teardown(async () => kernel.stop())

  await waitForNReadyWorkers(kernel.registry, WORKER_CONFIGS.length)

  const orkPublicKey = kernel.getPublicKey()
  const clientRpc = new HyperswarmRPC({ bootstrap })
  t.teardown(async () => clientRpc.destroy())

  const allTargets = fleets.flatMap(({ workerId, fleet }) =>
    fleet.listThings().map(device => ({ workerId, deviceId: device.id }))
  )

  return { kernel, clientRpc, orkPublicKey, allTargets }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test(`stress: 1 kernel — ${WORKER_CONFIGS.length} workers — ${DEVICES_PER_WORKER} devices each — concurrent action dispatch`, {
  timeout: TEST_TIMEOUT_MS
}, async (t) => {
  const { kernel, clientRpc, orkPublicKey, allTargets } = await setupStressFixture(t)

  t.comment(`workers: ${WORKER_CONFIGS.length}, devices: ${allTargets.length}`)

  // Round 1 — concurrent reboot (1 vote) across all device targets.
  // Listener registered before push so auto-approved commands are not missed.
  const round1Done = waitForNCommandsDone(kernel, allTargets.length, ROUND_TIMEOUT_MS)
  await Promise.all(
    allTargets.map(({ deviceId }) =>
      pushAction(clientRpc, orkPublicKey, {
        query: { id: deviceId },
        action: 'reboot',
        params: [],
        voter: 'stress-voter-1',
        authPerms: ['miner:w']
      })
    )
  )
  await t.execution(() => round1Done, `Round 1: ${allTargets.length} concurrent reboot (1 vote) actions complete`)

  // Round 2 — concurrent updateThing (rack action, 1 vote) across all device targets
  const round2Done = waitForNCommandsDone(kernel, allTargets.length, ROUND_TIMEOUT_MS)
  await Promise.all(
    allTargets.map(({ workerId, deviceId }) =>
      pushAction(clientRpc, orkPublicKey, {
        query: {},
        action: 'updateThing',
        params: [{ workerId, id: deviceId, info: { location: 'stress-round-2' } }],
        voter: 'stress-voter-1',
        authPerms: ['miner:w']
      })
    )
  )
  await t.execution(() => round2Done, `Round 2: ${allTargets.length} concurrent updateThing (rack action) complete`)

  // Round 3 — concurrent powerCycle (2 votes required)
  // Push all, then cast the second vote concurrently for every pending action
  const round3Done = waitForNCommandsDone(kernel, allTargets.length, ROUND_TIMEOUT_MS)
  const round3Ids = await Promise.all(
    allTargets.map(({ deviceId }) =>
      pushAction(clientRpc, orkPublicKey, {
        query: { id: deviceId },
        action: 'powerCycle',
        params: [],
        voter: 'stress-voter-1',
        authPerms: ['miner:w']
      })
    )
  )
  await Promise.all(
    round3Ids.map(id => voteAction(clientRpc, orkPublicKey, { id, voter: 'stress-voter-2', authPerms: ['miner:w'] }))
  )
  await t.execution(() => round3Done, `Round 3: ${allTargets.length} concurrent powerCycle (2 votes) actions complete`)

  // Round 4 — concurrent factoryReset (3 votes required)
  // Push all, then cast votes 2 and 3 in separate sequential waves.
  const round4Done = waitForNCommandsDone(kernel, allTargets.length, ROUND_TIMEOUT_MS)
  const round4Ids = await Promise.all(
    allTargets.map(({ deviceId }) =>
      pushAction(clientRpc, orkPublicKey, {
        query: { id: deviceId },
        action: 'factoryReset',
        params: [],
        voter: 'stress-voter-1',
        authPerms: ['miner:w']
      })
    )
  )
  await Promise.all(
    round4Ids.map(id => voteAction(clientRpc, orkPublicKey, { id, voter: 'stress-voter-2', authPerms: ['miner:w'] }))
  )
  await Promise.all(
    round4Ids.map(id => voteAction(clientRpc, orkPublicKey, { id, voter: 'stress-voter-3', authPerms: ['miner:w'] }))
  )
  await t.execution(() => round4Done, `Round 4: ${allTargets.length} concurrent factoryReset (3 votes) actions complete`)
})
