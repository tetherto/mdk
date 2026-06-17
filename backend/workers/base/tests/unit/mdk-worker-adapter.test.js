'use strict'

const test = require('brittle')
const { MDKWorkerAdapter } = require('../../lib/mdk-worker-adapter')
const { ACTIONS } = require('../../../../core/ork/lib/protocol/actions')

const CONTRACT = { metadata: { deviceFamily: 'test' }, capabilities: { telemetry: [], commands: [] } }

function makeAdapter (manager, workerId) {
  return new MDKWorkerAdapter(manager, CONTRACT, { workerId })
}

function req (action, payload = {}, deviceId = null) {
  return { id: 'req-1', action, sender: 'ork', deviceId, payload }
}

// A scheduler/EventEmitter worker (like a minerpool): no listThings, no mem,
// data served via getWrkExtData.
function nonThingManager (extData) {
  let lastReq = null
  return {
    _lastReq: () => lastReq,
    async getWrkExtData (r) { lastReq = r; return extData }
  }
}

// A ThingManager-shaped worker.
function thingManager (thingsById) {
  return {
    mem: { things: thingsById },
    listThings: () => Object.values(thingsById),
    async collectThingSnap (thg) { return { success: true, stats: { id: thg.id } } }
  }
}

// Captures the applyThings request so command targeting can be asserted.
function commandManager () {
  let lastApply = null
  return {
    mem: { things: { 'miner-0': { id: 'miner-0' }, 'miner-1': { id: 'miner-1' } } },
    listThings () { return Object.values(this.mem.things) },
    async applyThings (r) { lastApply = r; return 1 },
    _lastApply: () => lastApply
  }
}

// ---------------------------------------------------------------------------
// non-thing worker support (minerpool-style)
// ---------------------------------------------------------------------------

test('identity exposes a single synthetic device for non-thing workers', async (t) => {
  const adapter = makeAdapter(nonThingManager({}), 'minerpool-worker')
  const res = await adapter.handleRequest(req(ACTIONS.IDENTITY_REQUEST))
  t.is(res.action, ACTIONS.IDENTITY_RESPONSE)
  t.is(res.payload.workerId, 'minerpool-worker')
  t.alike(res.payload.devices, [{ deviceId: 'minerpool-worker' }])
})

test('ext_data telemetry routes to getWrkExtData with the query', async (t) => {
  const manager = nonThingManager({ stats: [{ hashrate: 42 }] })
  const adapter = makeAdapter(manager, 'minerpool-worker')
  const res = await adapter.handleRequest(
    req(ACTIONS.TELEMETRY_PULL, { query: { type: 'ext_data', key: 'stats' } }, 'minerpool-worker')
  )
  t.is(res.action, ACTIONS.TELEMETRY_RESPONSE)
  t.alike(res.payload.extData, { stats: [{ hashrate: 42 }] })
  t.alike(manager._lastReq(), { query: { type: 'ext_data', key: 'stats' } })
})

test('state.pull does not throw for non-thing workers', async (t) => {
  const adapter = makeAdapter(nonThingManager({}), 'minerpool-worker')
  const res = await adapter.handleRequest(req(ACTIONS.STATE_PULL))
  t.is(res.payload.thingCount, 0)
  t.alike(res.payload.state, {})
})

test('list telemetry returns empty for non-thing workers', async (t) => {
  const adapter = makeAdapter(nonThingManager({}), 'minerpool-worker')
  const res = await adapter.handleRequest(req(ACTIONS.TELEMETRY_PULL, { query: { type: 'list' } }))
  t.alike(res.payload.things, [])
})

// ---------------------------------------------------------------------------
// ThingManager workers unchanged (regression)
// ---------------------------------------------------------------------------

test('identity still maps thing ids for ThingManager workers', async (t) => {
  const adapter = makeAdapter(thingManager({ 'miner-0': { id: 'miner-0' }, 'miner-1': { id: 'miner-1' } }), 'miner-worker')
  const res = await adapter.handleRequest(req(ACTIONS.IDENTITY_REQUEST))
  t.alike(res.payload.devices, [{ deviceId: 'miner-0' }, { deviceId: 'miner-1' }])
})

test('metrics telemetry still collects a thing snap for ThingManager workers', async (t) => {
  const adapter = makeAdapter(thingManager({ 'miner-0': { id: 'miner-0' } }), 'miner-worker')
  const res = await adapter.handleRequest(req(ACTIONS.TELEMETRY_PULL, { query: { type: 'metrics' } }, 'miner-0'))
  t.is(res.payload.metrics.success, true)
  t.is(res.payload.metrics.stats.id, 'miner-0')
})

// ---------------------------------------------------------------------------
// device-scoped command targeting
// ---------------------------------------------------------------------------

test('a device-scoped command targets only the addressed device', async (t) => {
  const manager = commandManager()
  const adapter = makeAdapter(manager, 'miner-worker')
  const res = await adapter.handleRequest(
    { id: 'c-1', action: ACTIONS.COMMAND_REQUEST, sender: 'ork', deviceId: 'miner-0', payload: { commandId: 'x', command: 'setPowerMode', params: { mode: 'high' } } }
  )
  t.is(res.payload.status, 'SUCCESS')
  const apply = manager._lastApply()
  t.is(apply.method, 'setPowerMode')
  t.alike(apply.params, ['high'])
  t.alike(apply.thingIds, ['miner-0'])
  t.alike(apply.query, { id: { $in: ['miner-0'] } }, 'query scopes applyThings to the one device')
})
