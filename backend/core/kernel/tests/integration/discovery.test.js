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

const LOOPBACK = '127.0.0.1'

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
  const testnet = await createTestnet(4, t.teardown)
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
  const workerDht = testnet.createNode()
  const workerRpc = new HyperswarmRPC({ keyPair: workerDht.defaultKeyPair, dht: workerDht })
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
  const workerSwarm = new Hyperswarm({ dht: testnet.createNode() })
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
  const orkDht = testnet.createNode()
  const orkRpc = new HyperswarmRPC({ keyPair: orkDht.defaultKeyPair, dht: orkDht })
  const workerChannel = new WorkerChannel({ timeout: 10000, rpc: orkRpc })
  const registry = new WorkerRegistry({
    store: createMockStore(),
    capabilityStore: createMockStore()
  })

  const listener = new DHTListener({
    topic: topic.toString('hex'),
    registry,
    workerChannel,
    workerKeys: [workerRpcKey],
    swarmOpts: { dht: testnet.createNode() }
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
  const testnet = await createTestnet(4, t.teardown)
  const bootstrap = testnet.bootstrap
  const topic = crypto.randomBytes(32)

  // Kernel side joins FIRST (client querying). The worker announces afterwards, so
  // the Kernel connects during the worker's join window — the timing that left the
  // worker's connection without a key before the fix.
  const orkDht = testnet.createNode()
  const orkRpc = new HyperswarmRPC({ keyPair: orkDht.defaultKeyPair, dht: orkDht })
  const workerChannel = new WorkerChannel({ timeout: 10000, rpc: orkRpc })
  const registry = new WorkerRegistry({ store: createMockStore(), capabilityStore: createMockStore() })
  // The worker's key is unknown until it boots, after the listener: this test
  // is about join timing, so admit any topic peer.
  const listener = new DHTListener({ topic: topic.toString('hex'), registry, workerChannel, allowAnyWorker: true, swarmOpts: { dht: testnet.createNode() } })
  await listener.start()

  // Real WorkerRuntime — exercises _joinDiscoveryTopic (handler-before-join,
  // discovery.flushed(), re-announce) end-to-end, not a hand-rolled swarm.
  const runtime = new WorkerRuntime(simPlugin, {
    workerId: 'wm-rack-1',
    kernelTopic: topic.toString('hex'),
    bootstrap,
    dhtHost: LOOPBACK,
    allowedKeys: [orkRpc.defaultKeyPair.publicKey],
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
      async register () { registerCount++; return { registered: true } },
      async setReady () {}
    },
    workerChannel: {
      connect: () => ({ _hrpcKey: Buffer.alloc(32) }),
      // replies are schema-checked, so they must be real response envelopes
      send: async (_ch, env) => buildResponse(env, env.action === ACTIONS.IDENTITY_REQUEST ? ACTIONS.IDENTITY_RESPONSE : ACTIONS.CAPABILITY_RESPONSE, {
        workerId: 'dup-worker',
        devices: [{ deviceId: 'd1' }],
        contract: {
          metadata: { provider: 'x' },
          capabilities: {}
        }
      }, 'dup-worker'),
      disconnect: async () => {}
    }
  })

  const key = Buffer.alloc(32, 'a').toString('hex')
  await listener._onWorkerKeyReceived(key)
  t.is(registerCount, 1, 'first registered')

  await listener._onWorkerKeyReceived(key)
  t.is(registerCount, 1, 'duplicate prevented')
})

function fakeChannelListener ({ identity, contract, workerKeys, allowAnyWorker }) {
  const registry = new WorkerRegistry({ store: createMockStore(), capabilityStore: createMockStore() })
  const workerChannel = {
    connect: () => ({}),
    disconnect: async () => {},
    send: async (_ch, env) => env.action === ACTIONS.IDENTITY_REQUEST
      ? buildResponse(env, ACTIONS.IDENTITY_RESPONSE, identity, 'w')
      : buildResponse(env, ACTIONS.CAPABILITY_RESPONSE, { contract }, 'w')
  }
  return { registry, listener: new DHTListener({ topic: null, registry, workerChannel, workerKeys, allowAnyWorker }) }
}

const GOOD_CONTRACT = { metadata: { provider: 't' }, capabilities: { commands: [] } }

test('discovery - malformed identity reply is not registered', async (t) => {
  const { registry, listener } = fakeChannelListener({ identity: { workerId: 'w', devices: [{ id: 'no-deviceId' }] }, contract: GOOD_CONTRACT })
  await listener._onWorkerKeyReceived('aa'.repeat(32))
  t.is(registry.listWorkers().length, 0)
})

test('discovery - malformed capability reply terminates the half-registered worker', async (t) => {
  const { registry, listener } = fakeChannelListener({ identity: { workerId: 'w', devices: [{ deviceId: 'd' }] }, contract: { capabilities: {} } })
  await listener._onWorkerKeyReceived('aa'.repeat(32))
  t.is(registry.listWorkers().length, 0)
  t.is(registry.resolveWorkerForDevice('d'), null)
})

test('discovery - a registration that throws answers a fixed code, not the message', async (t) => {
  const { registry, listener } = fakeChannelListener({ identity: { workerId: 'w', devices: [{ deviceId: 'd' }] }, contract: GOOD_CONTRACT })
  registry.register = async () => { throw new Error('Cannot read properties of undefined') }
  t.alike(await listener._onWorkerKeyReceived('aa'.repeat(32)), { registered: false, error: 'ERR_WORKER_REGISTRATION_FAILED' })
})

test('discovery - a second key cannot take over a registered workerId', async (t) => {
  const { registry, listener } = fakeChannelListener({ identity: { workerId: 'w', devices: [{ deviceId: 'd' }] }, contract: GOOD_CONTRACT })
  t.alike(await listener._onWorkerKeyReceived('aa'.repeat(32)), { registered: true, workerId: 'w' })
  t.alike(await listener._onWorkerKeyReceived('bb'.repeat(32)), { registered: false, error: 'ERR_WORKER_KEY_CONFLICT', workerId: 'w' })
  const workers = registry.listWorkers()
  t.is(workers.length, 1)
  t.is(workers[0].rpcKey, 'aa'.repeat(32), 'still bound to the first key')
})

test('discovery - a device bound to another worker refuses the claimant, reported once per key', async (t) => {
  const registry = new WorkerRegistry({ store: createMockStore(), capabilityStore: createMockStore() })
  await registry.register({ workerId: 'rig-a', deviceIds: ['d1'], rpcKey: 'aa'.repeat(32), channel: null })
  const conflicts = []
  let disconnects = 0
  const listener = new DHTListener({
    topic: null,
    registry,
    onConflict: (c) => conflicts.push(c),
    workerChannel: {
      connect: () => ({}),
      disconnect: async () => { disconnects++ },
      send: async (_ch, env) => env.action === ACTIONS.IDENTITY_REQUEST
        ? buildResponse(env, ACTIONS.IDENTITY_RESPONSE, { workerId: 'rig-b', devices: [{ deviceId: 'd1' }, { deviceId: 'd2' }] }, 'rig-b')
        : buildResponse(env, ACTIONS.CAPABILITY_RESPONSE, { contract: GOOD_CONTRACT }, 'rig-b')
    }
  })

  const outcome = await listener.discoverWorker('bb'.repeat(32))
  t.alike(outcome, { registered: false, error: 'ERR_WORKER_DEVICE_CONFLICT', workerId: 'rig-b', deviceId: 'd1', ownerId: 'rig-a' })
  t.is(disconnects, 1)
  // Local discovery re-offers the key on every rescan.
  await listener.discoverWorker('bb'.repeat(32))
  t.alike(conflicts, [{ error: 'ERR_WORKER_DEVICE_CONFLICT', workerId: 'rig-b', deviceId: 'd1', ownerId: 'rig-a', rpcKey: 'bb'.repeat(32) }])

  await registry.terminate('rig-a')
  t.alike(await listener.discoverWorker('bb'.repeat(32)), { registered: true, workerId: 'rig-b' })
  t.is(registry.resolveWorkerForDevice('d1').workerId, 'rig-b')
})

const KEY_A = 'aa'.repeat(32)
const KEY_B = 'bb'.repeat(32)

// `identities` maps an rpcKey to the identity that Worker answers with. The
// registry is recovered from a store where rig-a owns d1 and d2, the state a
// Kernel restart leaves behind, and its releases are wired to the listener the
// way the Kernel wires them.
async function recoveredBindingListener (identities) {
  const store = createMockStore()
  const before = new WorkerRegistry({ store, capabilityStore: createMockStore() })
  await before.register({ workerId: 'rig-a', deviceIds: ['d1', 'd2'], rpcKey: KEY_A, channel: null })

  const events = { conflicts: [], admitted: [] }
  let listener = null
  const registry = new WorkerRegistry({ store, capabilityStore: createMockStore(), onRelease: (id) => listener.retryRefusedBy(id) })
  await registry.recover()
  listener = new DHTListener({
    topic: null,
    registry,
    onConflict: (c) => events.conflicts.push(c),
    onAdmitted: (a) => events.admitted.push(a),
    workerChannel: {
      connect: ({ rpcKey }) => ({ rpcKey }),
      disconnect: async () => {},
      send: async (ch, env) => env.action === ACTIONS.IDENTITY_REQUEST
        ? buildResponse(env, ACTIONS.IDENTITY_RESPONSE, identities[ch.rpcKey], 'w')
        : buildResponse(env, ACTIONS.CAPABILITY_RESPONSE, { contract: GOOD_CONTRACT }, 'w')
    }
  })
  // A retry runs in the background; the attempt it starts is the key's entry.
  const settled = (rpcKey) => listener._discoveredPeers.get(rpcKey) || { registered: false }
  return { registry, listener, events, settled }
}

test('discovery - a Worker refused for a device its recovered owner dropped gets in once the owner registers', async (t) => {
  const { registry, listener, events, settled } = await recoveredBindingListener({
    [KEY_A]: { workerId: 'rig-a', devices: [{ deviceId: 'd1' }] },
    [KEY_B]: { workerId: 'rig-b', devices: [{ deviceId: 'd2' }] }
  })

  // `mdk run` registers in mdk.yaml order, once: rig-b first, against rig-a's stored claim.
  t.alike(await listener.discoverWorker(KEY_B), { registered: false, error: 'ERR_WORKER_DEVICE_CONFLICT', workerId: 'rig-b', deviceId: 'd2', ownerId: 'rig-a', ownerPending: true })
  t.alike(events.conflicts, [{ error: 'ERR_WORKER_DEVICE_CONFLICT', workerId: 'rig-b', deviceId: 'd2', ownerId: 'rig-a', ownerPending: true, rpcKey: KEY_B }])

  t.alike(await listener.discoverWorker(KEY_A), { registered: true, workerId: 'rig-a' })
  t.alike(await settled(KEY_B), { registered: true, workerId: 'rig-b' }, 'retried without being offered again')
  t.is(registry.resolveWorkerForDevice('d2').workerId, 'rig-b')
  t.alike(events.admitted, [{ workerId: 'rig-b', rpcKey: KEY_B }])
  t.is(events.conflicts.length, 1)
})

test('discovery - an owner that comes back still listing the device turns the pending refusal into a real one', async (t) => {
  const { listener, events, settled } = await recoveredBindingListener({
    [KEY_A]: { workerId: 'rig-a', devices: [{ deviceId: 'd1' }, { deviceId: 'd2' }] },
    [KEY_B]: { workerId: 'rig-b', devices: [{ deviceId: 'd2' }] }
  })

  await listener.discoverWorker(KEY_B)
  await listener.discoverWorker(KEY_A)
  t.is((await settled(KEY_B)).registered, false)
  t.alike(events.conflicts.map(c => c.ownerPending), [true, undefined], 'reported again, now as a conflict with a live owner')
  t.alike(events.admitted, [])

  // Offering it again changes nothing, and says nothing.
  await listener.discoverWorker(KEY_B)
  t.is(events.conflicts.length, 2)
})

test('discovery - terminating the owner admits the Worker it refused without another offer', async (t) => {
  const { registry, listener, events, settled } = await recoveredBindingListener({
    [KEY_B]: { workerId: 'rig-b', devices: [{ deviceId: 'd2' }] }
  })

  await listener.discoverWorker(KEY_B)
  // rig-a was renamed and never comes back: the operator runs worker.terminate.
  await registry.terminate('rig-a')
  t.alike(await settled(KEY_B), { registered: true, workerId: 'rig-b' })
  t.alike(events.admitted, [{ workerId: 'rig-b', rpcKey: KEY_B }])
})

test('discovery - a peer that never answers is reported once per key, and again after it recovers', async (t) => {
  const registry = new WorkerRegistry({ store: createMockStore(), capabilityStore: createMockStore() })
  const unreachable = []
  let answers = false
  const listener = new DHTListener({
    topic: null,
    registry,
    onUnreachable: (u) => unreachable.push(u),
    workerChannel: {
      connect: () => ({}),
      disconnect: async () => {},
      // A Worker on another DHT is dialled but never replies: the request times
      // out and _pullIdentity returns nothing.
      send: async (_ch, env) => answers
        ? (env.action === ACTIONS.IDENTITY_REQUEST
            ? buildResponse(env, ACTIONS.IDENTITY_RESPONSE, { workerId: 'satec', devices: [{ deviceId: 'd1' }] }, 'satec')
            : buildResponse(env, ACTIONS.CAPABILITY_RESPONSE, { contract: GOOD_CONTRACT }, 'satec'))
        : null
    }
  })

  const key = 'cc'.repeat(32)
  t.alike(await listener.discoverWorker(key), { registered: false, error: 'ERR_WORKER_IDENTITY_UNAVAILABLE' })
  // Local discovery re-offers the key on every rescan; the operator hears once.
  await listener.discoverWorker(key)
  t.alike(unreachable, [{ error: 'ERR_WORKER_IDENTITY_UNAVAILABLE', rpcKey: key }])

  answers = true
  t.alike(await listener.discoverWorker(key), { registered: true, workerId: 'satec' })
  t.is(unreachable.length, 1, 'a worker that came back is not reported again')
})

test('discovery - a channel that will not open is reported as unreachable', async (t) => {
  const registry = new WorkerRegistry({ store: createMockStore(), capabilityStore: createMockStore() })
  const unreachable = []
  const listener = new DHTListener({
    topic: null,
    registry,
    onUnreachable: (u) => unreachable.push(u),
    workerChannel: { connect: () => null, disconnect: async () => {}, send: async () => null }
  })

  t.alike(await listener.discoverWorker('dd'.repeat(32)), { registered: false, error: 'ERR_CHANNEL_NOT_CONNECTED' })
  t.alike(unreachable, [{ error: 'ERR_CHANNEL_NOT_CONNECTED', rpcKey: 'dd'.repeat(32) }])
})

test('discovery - workerKeys allowlist drops unknown topic peers', async (t) => {
  const { listener } = fakeChannelListener({ identity: {}, contract: {}, workerKeys: ['aa'.repeat(32)] })
  const seen = []
  listener._onWorkerKeyReceived = (k) => { seen.push(k) }
  const EventEmitter = require('events')
  for (const key of ['bb'.repeat(32), 'aa'.repeat(32)]) {
    const stream = new EventEmitter()
    stream.destroy = () => stream.emit('close')
    listener._handleSwarmConnection(stream)
    stream.emit('data', Buffer.from(key, 'hex'))
  }
  t.alike(seen, ['aa'.repeat(32)])
})

// Feed each key through the swarm key-exchange path; returns the keys that
// reached registration.
function announce (listener, keys) {
  const seen = []
  listener._onWorkerKeyReceived = (k) => { seen.push(k) }
  const EventEmitter = require('events')
  for (const key of keys) {
    const stream = new EventEmitter()
    stream.destroy = () => stream.emit('close')
    listener._handleSwarmConnection(stream)
    stream.emit('data', Buffer.from(key, 'hex'))
  }
  return seen
}

test('discovery - empty workerKeys admits no topic peer (fail closed)', async (t) => {
  const { listener } = fakeChannelListener({ identity: {}, contract: {} })
  t.absent(listener.allowAnyWorker)
  t.alike(announce(listener, ['aa'.repeat(32), 'bb'.repeat(32)]), [])
})

test('discovery - allowWorkerKey admits a topic peer at runtime', async (t) => {
  const { listener } = fakeChannelListener({ identity: {}, contract: {} })
  t.is(listener.allowWorkerKey(Buffer.alloc(32, 0xcc)), 'cc'.repeat(32))
  listener.allowWorkerKey('DD'.repeat(32))
  t.alike(announce(listener, ['aa'.repeat(32), 'cc'.repeat(32), 'dd'.repeat(32)]), ['cc'.repeat(32), 'dd'.repeat(32)])
})

test('discovery - allowAnyWorker admits every topic peer', async (t) => {
  const { listener } = fakeChannelListener({ identity: {}, contract: {}, allowAnyWorker: true })
  t.alike(announce(listener, ['aa'.repeat(32), 'bb'.repeat(32)]), ['aa'.repeat(32), 'bb'.repeat(32)])
})

test('discovery - directly handed keys (registerWorker / local discovery) skip the topic allowlist', async (t) => {
  const { registry, listener } = fakeChannelListener({ identity: { workerId: 'w', devices: [{ deviceId: 'd' }] }, contract: GOOD_CONTRACT })
  await listener.discoverWorker('aa'.repeat(32))
  t.is(registry.listWorkers().length, 1, 'registered without being on workerKeys')
})

test('discovery - discoverWorker reports whether the worker reached Ready', async (t) => {
  const good = fakeChannelListener({ identity: { workerId: 'w', devices: [{ deviceId: 'd' }] }, contract: GOOD_CONTRACT })
  t.alike(await good.listener.discoverWorker('aa'.repeat(32)), { registered: true, workerId: 'w' }, 'registered')
  t.alike(await good.listener.discoverWorker('aa'.repeat(32)), { registered: true, workerId: 'w' }, 'a re-offer of a registered key still reports registered')

  const bad = fakeChannelListener({ identity: { workerId: 'w', devices: [{ id: 'no-deviceId' }] }, contract: GOOD_CONTRACT })
  t.alike(await bad.listener.discoverWorker('bb'.repeat(32)), { registered: false, error: 'ERR_WORKER_IDENTITY_UNAVAILABLE' }, 'malformed identity is reported, not swallowed')
  t.is(bad.listener._discoveredPeers.has('bb'.repeat(32)), false, 'and the key is dropped so the next offer retries')
})

// The silence behind F3: the Kernel retried a worker it could not reach every few
// seconds, forever. A caller that retries has to see each attempt's real outcome
// to know how long that has been going on — in particular, an offer arriving
// while an attempt is still in flight must not come back looking like a success.
test('discovery - an offer during an in-flight attempt resolves to that attempt', async (t) => {
  let release
  const blocked = new Promise((resolve) => { release = resolve })
  const { listener } = fakeChannelListener({ identity: { workerId: 'w', devices: [{ deviceId: 'd' }] }, contract: GOOD_CONTRACT })
  listener.workerChannel.connect = () => { throw new Error('CHANNEL_CLOSED: channel closed') }
  listener._register = async () => { await blocked; return { registered: false, error: 'ERR_CHANNEL_NOT_CONNECTED' } }

  const first = listener.discoverWorker('cc'.repeat(32))
  const second = listener.discoverWorker('cc'.repeat(32))
  release()
  const failed = { registered: false, error: 'ERR_CHANNEL_NOT_CONNECTED' }
  t.alike(await Promise.all([first, second]), [failed, failed], 'both see the failure')
})
