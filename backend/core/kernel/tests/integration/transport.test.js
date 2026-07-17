'use strict'

const test = require('brittle')
const HyperswarmRPC = require('@hyperswarm/rpc')
const DHT = require('hyperdht')
const { HRPCListener } = require('../../lib/transport/hrpc-listener')
const { WorkerChannel } = require('../../lib/transport/worker-channel')
const { build: buildEnvelope, serialize, deserialize } = require('../../lib/protocol/envelope')
const { ACTIONS, MESSAGE_TYPES } = require('../../lib/protocol/actions')

// ─── Mock modules for listener tests ───────────────────────────────────
function createMockModules () {
  const workers = [
    { workerId: 'worker-1', deviceIds: ['wm001', 'wm002'], state: 'READY', healthState: 'HEALTHY' }
  ]

  return {
    dispatcher: {
      async dispatch (envelope) {
        return { commandId: 'test-cmd-1', status: 'QUEUED' }
      }
    },
    telemetryCollector: {
      async pull (deviceId, query) {
        return { deviceId, metrics: { hashrate: 90 }, timestamp: Date.now() }
      }
    },
    registry: {
      listWorkers () { return workers },
      getCapabilities (deviceId) {
        return { commands: [{ name: 'reboot' }], telemetry: [{ name: 'hashrate' }] }
      }
    },
    actionManager: {
      pushAction: async () => ({ id: null, errors: ['ERR_KERNEL_ACTION_CALLS_EMPTY'] }),
      pushActionsBatch: async () => [],
      getAction: async () => ({}),
      getActionsBatch: async () => [],
      queryActions: async () => ({}),
      voteAction: async () => 1,
      cancelActionsBatch: async () => []
    }
  }
}

// ─── HRPC Listener Tests ──────────────────────────────────────────────

test('hrpc-listener - starts, accepts request, returns response', async (t) => {
  const mocks = createMockModules()
  const listener = new HRPCListener({
    ...mocks,
    whitelist: []
  })

  const { publicKey } = await listener.start()
  t.ok(publicKey, 'server has public key')
  t.is(publicKey.length, 32, 'public key is 32 bytes')

  // Create a client
  const clientDht = new DHT()
  const clientRpc = new HyperswarmRPC({ dht: clientDht })

  t.teardown(async () => {
    await clientRpc.destroy()
    await clientDht.destroy()
    await listener.stop()
  })

  // Send a worker.list request
  const envelope = buildEnvelope({
    action: 'worker.list',
    type: MESSAGE_TYPES.REQUEST,
    sender: 'test:client:1',
    payload: {}
  })

  const resBuf = await clientRpc.request(publicKey, 'mdk', serialize(envelope))
  const response = deserialize(resBuf)

  t.ok(response.workers, 'response has workers')
  t.is(response.workers.length, 1, 'has 1 worker')
  t.is(response.workers[0].workerId, 'worker-1')
})

test('hrpc-listener - whitelist blocks unauthorized client', async (t) => {
  const mocks = createMockModules()

  // Generate a random key for the "authorized" client
  const authorizedKeyPair = DHT.keyPair()
  const authorizedHex = authorizedKeyPair.publicKey.toString('hex')

  const listener = new HRPCListener({
    ...mocks,
    whitelist: [authorizedHex]
  })

  const { publicKey } = await listener.start()

  // Create an UNAUTHORIZED client (different key)
  const unauthorizedDht = new DHT()
  const unauthorizedRpc = new HyperswarmRPC({ dht: unauthorizedDht })

  t.teardown(async () => {
    await unauthorizedRpc.destroy()
    await unauthorizedDht.destroy()
    await listener.stop()
  })

  const envelope = buildEnvelope({
    action: 'worker.list',
    type: MESSAGE_TYPES.REQUEST,
    sender: 'test:client:unauthorized',
    payload: {}
  })

  try {
    await unauthorizedRpc.request(publicKey, 'mdk', serialize(envelope))
    t.fail('should have been rejected')
  } catch (err) {
    t.ok(err, 'unauthorized client was rejected')
  }
})

test('hrpc-listener - whitelist admits authorized client', async (t) => {
  const mocks = createMockModules()

  // Generate the authorized key pair — this client's pubkey will be in the allowlist
  const authorizedKeyPair = DHT.keyPair()
  const authorizedHex = authorizedKeyPair.publicKey.toString('hex')

  const listener = new HRPCListener({
    ...mocks,
    whitelist: [authorizedHex]
  })

  const { publicKey } = await listener.start()

  // Create an AUTHORIZED client using the allowlisted key pair
  const authorizedDht = new DHT({ keyPair: authorizedKeyPair })
  const authorizedRpc = new HyperswarmRPC({ dht: authorizedDht })

  t.teardown(async () => {
    await authorizedRpc.destroy()
    await authorizedDht.destroy()
    await listener.stop()
  })

  const envelope = buildEnvelope({
    action: ACTIONS.WORKER_LIST,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'test:client:authorized',
    payload: {}
  })

  const resBuf = await authorizedRpc.request(publicKey, 'mdk', serialize(envelope))
  const response = deserialize(resBuf)

  t.ok(response.workers, 'authorized client received response')
  t.is(response.workers.length, 1, 'response contains workers')
})

test('hrpc-listener - getRpc returns rpc instance', async (t) => {
  const mocks = createMockModules()
  const listener = new HRPCListener({ ...mocks, whitelist: [] })

  await listener.start()
  t.teardown(() => listener.stop())

  const rpc = listener.getRpc()
  t.ok(rpc, 'getRpc returns instance')
})

// ─── WorkerChannel Tests ─────────────────────────────────────────────

test('worker-channel - connect creates channel with hrpc key', (t) => {
  const wc = new WorkerChannel({ timeout: 5000 })
  const key = DHT.keyPair().publicKey.toString('hex')
  const channel = wc.connect({ rpcKey: key })

  t.ok(channel, 'channel created')
  t.ok(channel._hrpcKey, 'has hrpc key')
  t.is(channel._hrpcKey.toString('hex'), key, 'key matches')
})

test('worker-channel - send works with in-process channel', async (t) => {
  const wc = new WorkerChannel({ timeout: 5000 })
  const mockChannel = {
    async request (envelope) {
      return { action: 'health.pong', payload: { status: 'OK' } }
    }
  }

  const envelope = buildEnvelope({
    action: ACTIONS.HEALTH_PING,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'kernel:kernel:test',
    payload: {}
  })

  const response = await wc.send(mockChannel, envelope)
  t.is(response.payload.status, 'OK')
})

test('worker-channel - send throws on null channel', async (t) => {
  const wc = new WorkerChannel({ timeout: 5000 })
  const envelope = buildEnvelope({
    action: ACTIONS.HEALTH_PING,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'kernel',
    payload: {}
  })

  try {
    await wc.send(null, envelope)
    t.fail('should throw')
  } catch (err) {
    t.is(err.message, 'ERR_CHANNEL_NOT_CONNECTED')
  }
})

test('worker-channel - send times out', async (t) => {
  const wc = new WorkerChannel({ timeout: 100 })
  const slowChannel = {
    request () { return new Promise(() => {}) } // never resolves
  }

  const envelope = buildEnvelope({
    action: ACTIONS.HEALTH_PING,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'kernel',
    payload: {}
  })

  try {
    await wc.send(slowChannel, envelope)
    t.fail('should timeout')
  } catch (err) {
    t.is(err.message, 'ERR_CHANNEL_TIMEOUT')
  }
})

// ─── HRPC + WorkerChannel E2E ────────────────────────────────────────

test('worker-channel - send via HRPC to a real RPC server (worker mock)', async (t) => {
  // Start a mock "worker" RPC server
  const workerDht = new DHT()
  const workerRpc = new HyperswarmRPC({ dht: workerDht })
  const workerServer = workerRpc.createServer()

  workerServer.respond('mdk', async (reqBuf) => {
    const envelope = deserialize(reqBuf)
    if (envelope.action === ACTIONS.HEALTH_PING) {
      return serialize({ action: ACTIONS.HEALTH_PONG, payload: { status: 'OK' } })
    }
    if (envelope.action === ACTIONS.TELEMETRY_PULL) {
      return serialize({
        action: ACTIONS.TELEMETRY_RESPONSE,
        payload: { deviceId: envelope.deviceId, metrics: { hashrate: 95.5 } }
      })
    }
    return serialize({ error: 'unknown' })
  })

  const workerKeyPair = DHT.keyPair()
  await workerServer.listen(workerKeyPair)

  // Create Kernel-side WorkerChannel with its own RPC instance
  const kernelDht = new DHT()
  const kernelRpc = new HyperswarmRPC({ dht: kernelDht })
  const wc = new WorkerChannel({ timeout: 10000, rpc: kernelRpc })

  t.teardown(async () => {
    await workerServer.close()
    await workerRpc.destroy()
    await workerDht.destroy()
    await kernelRpc.destroy()
    await kernelDht.destroy()
  })

  // Connect to worker
  const channel = wc.connect({ rpcKey: workerServer.publicKey })

  // Send health.ping
  const pingEnv = buildEnvelope({
    action: ACTIONS.HEALTH_PING,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'kernel:kernel:test',
    payload: {}
  })
  const pingResp = await wc.send(channel, pingEnv)
  t.is(pingResp.payload.status, 'OK', 'health ping works over HRPC')

  // Send telemetry.pull
  const telEnv = buildEnvelope({
    action: ACTIONS.TELEMETRY_PULL,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'kernel:kernel:test',
    deviceId: 'wm001',
    payload: { deviceId: 'wm001', query: { type: 'metrics' } }
  })
  const telResp = await wc.send(channel, telEnv)
  t.is(telResp.payload.metrics.hashrate, 95.5, 'telemetry pull works over HRPC')
})
