'use strict'

const test = require('brittle')
const crypto = require('crypto')
const createTestnet = require('hyperdht/testnet')
const HyperswarmRPC = require('@hyperswarm/rpc')
const Hyperswarm = require('hyperswarm')
const { DHTListener } = require('../../lib/discovery/dht-listener')
const WorkerRuntime = require('../../../mdk-worker/lib/worker-runtime')
const simPlugin = require('../../../mdk-worker/tests/fixtures/sim-plugin')
const { WorkerRegistry } = require('../../lib/modules/worker-registry')
const { WorkerChannel } = require('../../lib/transport/worker-channel')
const { ACTIONS } = require('../../lib/protocol/actions')
const { serialize, deserialize, buildResponse } = require('../../lib/protocol/envelope')

function createMockStore () {
  const data = new Map()
  return {
    async get (key) { const v = data.get(key); return v ? { value: v } : null },
    async put (key, value) { data.set(key, value) },
    async del (key) { data.delete(key) },
    createReadStream () {
      const entries = [...data.entries()].map(([key, value]) => ({ key, value }))
      return (async function * () { for (const e of entries) yield e })()
    }
  }
}

test('discovery - DHTListener discovers worker and registers it', async (t) => {
  const testnet = await createTestnet(3, t.teardown)
  const bootstrap = testnet.bootstrap
  const topic = crypto.randomBytes(32)

  const contract = {
    metadata: {
      provider: 'test',
      deviceFamily: 'miner',
      brand: 'TestMiner',
      modelsSupported: ['T1'],
      overview: 'Test'
    },
    capabilities: {
      telemetry: [{ name: 'hashrate', type: 'number', unit: 'TH/s', description: 'test' }],
      commands: [{ name: 'reboot', params: [] }],
      health: { supportedStates: ['OK'] },
      errors: {}
    }
  }

  // ─── Worker side ────────────────────────────────────────────────
  // 1. Start an RPC server
  const workerRpc = new HyperswarmRPC({ bootstrap })
  const workerServer = workerRpc.createServer()

  workerServer.respond('mdk', async (reqBuf) => {
    const envelope = deserialize(reqBuf)
    switch (envelope.action) {
      case ACTIONS.IDENTITY_REQUEST:
        return serialize(buildResponse(envelope, ACTIONS.IDENTITY_RESPONSE, {
          workerId: 'wm-rack-1',
          devices: [{ deviceId: 'wm001' }, { deviceId: 'wm002' }]
        }, 'wm-rack-1'))
      case ACTIONS.CAPABILITY_REQUEST:
        return serialize(buildResponse(envelope, ACTIONS.CAPABILITY_RESPONSE, {
          contract
        }, 'wm-rack-1'))
      case ACTIONS.HEALTH_PING:
        return serialize(buildResponse(envelope, ACTIONS.HEALTH_PONG, {
          status: 'OK'
        }, 'wm-rack-1'))
      default:
        return serialize({ error: 'unknown' })
    }
  })

  await workerServer.listen()
  const workerRpcKey = workerServer.publicKey

  // 2. Join swarm and send RPC key to connecting Kernel
  const workerSwarm = new Hyperswarm({ bootstrap })
  workerSwarm.join(topic, { server: true, client: false })
  await workerSwarm.flush()

  workerSwarm.on('connection', (stream) => {
    // Send RPC public key (32 bytes) so Kernel knows where to send HRPC requests
    stream.write(workerRpcKey)
    stream.on('error', () => {})
  })

  t.teardown(async () => {
    await workerSwarm.destroy()
    await workerServer.close()
    await workerRpc.destroy()
  })

  // ─── Kernel side ───────────────────────────────────────────────────
  const orkRpc = new HyperswarmRPC({ bootstrap })
  const workerChannel = new WorkerChannel({ timeout: 10000, rpc: orkRpc })
  const registry = new WorkerRegistry({
    store: createMockStore(),
    capabilityStore: createMockStore()
  })

  const listener = new DHTListener({
    topic: topic.toString('hex'),
    registry,
    workerChannel,
    swarmOpts: { bootstrap }
  })

  t.teardown(async () => {
    await listener.stop()
    await orkRpc.destroy()
  })

  await listener.start()

  // Wait for discovery + registration
  let attempts = 0
  while (registry.listWorkers().length === 0 && attempts < 30) {
    await new Promise(resolve => setTimeout(resolve, 500))
    attempts++
  }

  const workers = registry.listWorkers()
  t.is(workers.length, 1, 'one worker discovered')
  t.is(workers[0].workerId, 'wm-rack-1')
  t.is(workers[0].state, 'READY')
  t.is(workers[0].deviceIds.length, 2)

  const dev = registry.resolveWorkerForDevice('wm001')
  t.ok(dev, 'wm001 resolvable')
  t.is(dev.workerId, 'wm-rack-1')

  const caps = registry.getCapabilities('wm001')
  t.ok(caps, 'capabilities stored')
  t.ok(caps.commands, 'has commands')

  t.ok(registry.isRoutable('wm-rack-1'), 'worker is routable')
})

test('discovery - real runtime announces and listener registers (kernel joins first)', async (t) => {
  const testnet = await createTestnet(3, t.teardown)
  const bootstrap = testnet.bootstrap
  const topic = crypto.randomBytes(32)

  // Kernel side joins FIRST (client querying). The worker announces afterwards, so
  // the Kernel connects during the worker's join window — the timing that left the
  // worker's connection without a key before the fix.
  const orkRpc = new HyperswarmRPC({ bootstrap })
  const workerChannel = new WorkerChannel({ timeout: 10000, rpc: orkRpc })
  const registry = new WorkerRegistry({ store: createMockStore(), capabilityStore: createMockStore() })
  const listener = new DHTListener({ topic: topic.toString('hex'), registry, workerChannel, swarmOpts: { bootstrap } })
  await listener.start()

  // Real WorkerRuntime — exercises _joinDiscoveryTopic (handler-before-join,
  // discovery.flushed(), re-announce) end-to-end, not a hand-rolled swarm.
  const runtime = new WorkerRuntime(simPlugin, {
    workerId: 'wm-rack-1',
    kernelTopic: topic.toString('hex'),
    bootstrap,
    devices: [
      { deviceId: 'd1', config: { hashrate: 100, power: 3000 } },
      { deviceId: 'd2', config: { hashrate: 140, power: 3200 } }
    ]
  })
  await runtime.start()

  t.teardown(async () => {
    await runtime.stop()
    await listener.stop()
    await orkRpc.destroy()
  })

  let attempts = 0
  while (registry.listWorkers().filter((w) => w.state === 'READY').length === 0 && attempts < 60) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    attempts++
  }

  const workers = registry.listWorkers()
  t.is(workers.length, 1, 'one worker registered via real announce -> key-exchange -> register')
  t.is(workers[0].workerId, 'wm-rack-1')
  t.is(workers[0].state, 'READY', 'reached READY')
  t.is(workers[0].deviceIds.length, 2, 'devices synced from identity')
})

test('discovery - contract validation', (t) => {
  const listener = new DHTListener({
    topic: null,
    registry: {},
    workerChannel: {}
  })

  t.absent(listener._validateContract(null))
  t.absent(listener._validateContract({}))
  t.absent(listener._validateContract({ capabilities: {} }))
  t.absent(listener._validateContract({ metadata: {} }))
  t.ok(listener._validateContract({
    metadata: { provider: 'test' },
    capabilities: { commands: [] }
  }))
})

test('discovery - duplicate peer prevention', async (t) => {
  let registerCount = 0
  const listener = new DHTListener({
    topic: 'test',
    registry: {
      async register () { registerCount++; return true },
      async setReady () {}
    },
    workerChannel: {
      connect: () => ({ _hrpcKey: Buffer.alloc(32) }),
      send: async () => ({
        payload: {
          workerId: 'dup-worker',
          devices: [{ deviceId: 'd1' }],
          contract: {
            metadata: { provider: 'x' },
            capabilities: {}
          }
        }
      }),
      disconnect: async () => {}
    }
  })

  const key = Buffer.alloc(32, 'a').toString('hex')
  await listener._onWorkerKeyReceived(key)
  t.is(registerCount, 1, 'first registered')

  await listener._onWorkerKeyReceived(key)
  t.is(registerCount, 1, 'duplicate prevented')
})
