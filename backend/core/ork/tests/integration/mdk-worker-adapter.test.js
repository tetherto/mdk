'use strict'

const test = require('brittle')
const HyperswarmRPC = require('@hyperswarm/rpc')
const DHT = require('hyperdht')
const { MDKWorkerAdapter } = require('../../../../workers/base/lib/mdk-worker-adapter')
const { ACTIONS, MESSAGE_TYPES } = require('../../lib/protocol/actions')
const { build, serialize, deserialize } = require('../../lib/protocol/envelope')

function createMockManager () {
  const things = {
    wm001: {
      id: 'wm001',
      type: 'miner-wm-m56s',
      tags: ['whatsminer', 'miner'],
      info: { serialNum: 'WM001' },
      opts: { address: '192.168.1.10', port: 4028 },
      ctrl: {
        isThingOnline () { return true },
        getSnap () {
          return {
            hashrate_rt: 92.5,
            hashrate_avg: 90,
            power: 3200,
            temperature: 65,
            status: 'online'
          }
        }
      }
    }
  }

  return {
    rackId: 'whatsminer-rack-1',
    mem: { things },
    listThings () {
      return Object.values(things).map(t => ({
        id: t.id,
        type: t.type,
        tags: t.tags,
        info: t.info,
        status: 'online'
      }))
    },
    async collectThingSnap (thg) { return thg.ctrl.getSnap() },
    async tailLog () { return [] },
    async getHistoricalLogs () { return [] },
    async getSettings () { return { autoReconnect: true } },
    async aggrStats () { return { totalHashrate: 92.5, count: 1 } },
    async registerThing (params) { return { id: 'wm002', ...params } },
    async updateThing (params) { return params },
    async forgetThings () { return 1 },
    async saveSettingsEntries (entries) { return entries },
    async saveThingComment (req) { return { id: 'cmt-1', ...req } },
    async editThingComment (req) { return req },
    async deleteThingComment () { return 1 },
    async applyThings (req) { return { applied: 1, method: req.method } },
    _getWrkExtData () { return {} },
    getThingConf () { return { pool: 'stratum://pool.example.com:3333' } }
  }
}

const contract = {
  metadata: { provider: 'microbt', deviceFamily: 'miner', brand: 'Whatsminer', modelsSupported: ['M56S'], overview: 'Test' },
  capabilities: {
    telemetry: [{ name: 'hashrate_rt', type: 'number', unit: 'TH/s', description: 'test' }],
    commands: [{ name: 'reboot', params: [] }],
    health: { supportedStates: ['OK'] },
    errors: {}
  }
}

async function sendToWorker (rpc, workerKey, action, payload, deviceId) {
  const envelope = build({
    action,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'test:client:1',
    deviceId: deviceId || null,
    payload: payload || {}
  })
  const resBuf = await rpc.request(workerKey, 'mdk', serialize(envelope))
  return deserialize(resBuf)
}

test('mdk-worker-adapter - identity request returns workerId and devices', async (t) => {
  const manager = createMockManager()
  const adapter = new MDKWorkerAdapter(manager, contract, { workerId: 'wm-rack-1' })
  const { publicKey } = await adapter.start()

  const clientDht = new DHT()
  const clientRpc = new HyperswarmRPC({ dht: clientDht })

  t.teardown(async () => {
    await clientRpc.destroy()
    await clientDht.destroy()
    await adapter.stop()
  })

  const resp = await sendToWorker(clientRpc, publicKey, ACTIONS.IDENTITY_REQUEST)
  t.is(resp.payload.workerId, 'wm-rack-1')
  t.is(resp.payload.devices.length, 1)
  t.is(resp.payload.devices[0].deviceId, 'wm001')
})

test('mdk-worker-adapter - capability request returns contract', async (t) => {
  const manager = createMockManager()
  const adapter = new MDKWorkerAdapter(manager, contract, { workerId: 'wm-rack-1' })
  const { publicKey } = await adapter.start()

  const clientDht = new DHT()
  const clientRpc = new HyperswarmRPC({ dht: clientDht })

  t.teardown(async () => {
    await clientRpc.destroy()
    await clientDht.destroy()
    await adapter.stop()
  })

  const resp = await sendToWorker(clientRpc, publicKey, ACTIONS.CAPABILITY_REQUEST)
  t.ok(resp.payload.contract)
  t.is(resp.payload.contract.metadata.brand, 'Whatsminer')
})

test('mdk-worker-adapter - telemetry pull returns metrics', async (t) => {
  const manager = createMockManager()
  const adapter = new MDKWorkerAdapter(manager, contract, { workerId: 'wm-rack-1' })
  const { publicKey } = await adapter.start()

  const clientDht = new DHT()
  const clientRpc = new HyperswarmRPC({ dht: clientDht })

  t.teardown(async () => {
    await clientRpc.destroy()
    await clientDht.destroy()
    await adapter.stop()
  })

  const resp = await sendToWorker(clientRpc, publicKey, ACTIONS.TELEMETRY_PULL, { query: { type: 'metrics' } }, 'wm001')
  t.ok(resp.payload.metrics)
  t.is(resp.payload.metrics.hashrate_rt, 92.5)
})

test('mdk-worker-adapter - telemetry pull list returns things', async (t) => {
  const manager = createMockManager()
  const adapter = new MDKWorkerAdapter(manager, contract, { workerId: 'wm-rack-1' })
  const { publicKey } = await adapter.start()

  const clientDht = new DHT()
  const clientRpc = new HyperswarmRPC({ dht: clientDht })

  t.teardown(async () => {
    await clientRpc.destroy()
    await clientDht.destroy()
    await adapter.stop()
  })

  const resp = await sendToWorker(clientRpc, publicKey, ACTIONS.TELEMETRY_PULL, { query: { type: 'list' } })
  t.ok(resp.payload.things)
  t.is(resp.payload.things.length, 1)
  t.is(resp.payload.things[0].id, 'wm001')
})

test('mdk-worker-adapter - command request dispatches to manager', async (t) => {
  const manager = createMockManager()
  const adapter = new MDKWorkerAdapter(manager, contract, { workerId: 'wm-rack-1' })
  const { publicKey } = await adapter.start()

  const clientDht = new DHT()
  const clientRpc = new HyperswarmRPC({ dht: clientDht })

  t.teardown(async () => {
    await clientRpc.destroy()
    await clientDht.destroy()
    await adapter.stop()
  })

  const resp = await sendToWorker(clientRpc, publicKey, ACTIONS.COMMAND_REQUEST, {
    commandId: 'cmd-1',
    command: 'reboot',
    params: {}
  }, 'wm001')
  t.is(resp.payload.status, 'SUCCESS')
  t.ok(resp.payload.result)
})

test('mdk-worker-adapter - health ping returns OK', async (t) => {
  const manager = createMockManager()
  const adapter = new MDKWorkerAdapter(manager, contract, { workerId: 'wm-rack-1' })
  const { publicKey } = await adapter.start()

  const clientDht = new DHT()
  const clientRpc = new HyperswarmRPC({ dht: clientDht })

  t.teardown(async () => {
    await clientRpc.destroy()
    await clientDht.destroy()
    await adapter.stop()
  })

  const resp = await sendToWorker(clientRpc, publicKey, ACTIONS.HEALTH_PING)
  t.is(resp.payload.status, 'OK')
})

test('mdk-worker-adapter - state pull returns device states', async (t) => {
  const manager = createMockManager()
  const adapter = new MDKWorkerAdapter(manager, contract, { workerId: 'wm-rack-1' })
  const { publicKey } = await adapter.start()

  const clientDht = new DHT()
  const clientRpc = new HyperswarmRPC({ dht: clientDht })

  t.teardown(async () => {
    await clientRpc.destroy()
    await clientDht.destroy()
    await adapter.stop()
  })

  const resp = await sendToWorker(clientRpc, publicKey, ACTIONS.STATE_PULL)
  t.ok(resp.payload.state)
  t.ok(resp.payload.state.wm001)
  t.is(resp.payload.state.wm001.status, 'online')
  t.is(resp.payload.thingCount, 1)
})
