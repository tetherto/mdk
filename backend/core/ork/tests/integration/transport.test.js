'use strict'

const test = require('brittle')
const net = require('net')
const HyperswarmRPC = require('@hyperswarm/rpc')
const DHT = require('hyperdht')
const { HRPCGateway } = require('../../lib/transport/hrpc-gateway')
const { IPCGateway } = require('../../lib/transport/ipc-gateway')
const { WorkerChannel } = require('../../lib/transport/worker-channel')
const { build: buildEnvelope, serialize, deserialize } = require('../../lib/protocol/envelope')
const { ACTIONS, MESSAGE_TYPES } = require('../../lib/protocol/actions')
const path = require('path')
const os = require('os')

// ─── Mock modules for gateway tests ───────────────────────────────────
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
    }
  }
}

// ─── HRPC Gateway Tests ──────────────────────────────────────────────

test('hrpc-gateway - starts, accepts request, returns response', async (t) => {
  const mocks = createMockModules()
  const gateway = new HRPCGateway({
    ...mocks,
    whitelist: []
  })

  const { publicKey } = await gateway.start()
  t.ok(publicKey, 'server has public key')
  t.is(publicKey.length, 32, 'public key is 32 bytes')

  // Create a client
  const clientDht = new DHT()
  const clientRpc = new HyperswarmRPC({ dht: clientDht })

  t.teardown(async () => {
    await clientRpc.destroy()
    await clientDht.destroy()
    await gateway.stop()
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

test('hrpc-gateway - whitelist blocks unauthorized client', async (t) => {
  const mocks = createMockModules()

  // Generate a random key for the "authorized" client
  const authorizedKeyPair = DHT.keyPair()
  const authorizedHex = authorizedKeyPair.publicKey.toString('hex')

  const gateway = new HRPCGateway({
    ...mocks,
    whitelist: [authorizedHex]
  })

  const { publicKey } = await gateway.start()

  // Create an UNAUTHORIZED client (different key)
  const unauthorizedDht = new DHT()
  const unauthorizedRpc = new HyperswarmRPC({ dht: unauthorizedDht })

  t.teardown(async () => {
    await unauthorizedRpc.destroy()
    await unauthorizedDht.destroy()
    await gateway.stop()
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

test('hrpc-gateway - whitelist admits authorized client', async (t) => {
  const mocks = createMockModules()

  // Generate the authorized key pair — this client's pubkey will be in the whitelist
  const authorizedKeyPair = DHT.keyPair()
  const authorizedHex = authorizedKeyPair.publicKey.toString('hex')

  const gateway = new HRPCGateway({
    ...mocks,
    whitelist: [authorizedHex]
  })

  const { publicKey } = await gateway.start()

  // Create an AUTHORIZED client using the whitelisted key pair
  const authorizedDht = new DHT({ keyPair: authorizedKeyPair })
  const authorizedRpc = new HyperswarmRPC({ dht: authorizedDht })

  t.teardown(async () => {
    await authorizedRpc.destroy()
    await authorizedDht.destroy()
    await gateway.stop()
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

test('hrpc-gateway - getRpc returns rpc instance', async (t) => {
  const mocks = createMockModules()
  const gateway = new HRPCGateway({ ...mocks, whitelist: [] })

  await gateway.start()
  t.teardown(() => gateway.stop())

  const rpc = gateway.getRpc()
  t.ok(rpc, 'getRpc returns instance')
})

// ─── IPC Gateway Tests ───────────────────────────────────────────────

test('ipc-gateway - starts, accepts request, returns response', async (t) => {
  const mocks = createMockModules()
  const sockPath = path.join(os.tmpdir(), `mdk-test-${Date.now()}.sock`)
  const gateway = new IPCGateway({ ...mocks, path: sockPath })

  await gateway.start()
  t.teardown(() => gateway.stop())

  // Connect as IPC client
  const response = await new Promise((resolve, reject) => {
    const client = net.connect(sockPath, () => {
      const envelope = buildEnvelope({
        action: 'worker.list',
        type: MESSAGE_TYPES.REQUEST,
        sender: 'test:ipc:1',
        payload: {}
      })
      client.write(JSON.stringify(envelope) + '\n')
    })

    let data = ''
    client.on('data', (chunk) => {
      data += chunk.toString()
      const newlineIdx = data.indexOf('\n')
      if (newlineIdx !== -1) {
        const line = data.slice(0, newlineIdx)
        client.end()
        resolve(JSON.parse(line))
      }
    })
    client.on('error', reject)
  })

  t.ok(response.workers, 'response has workers')
  t.is(response.workers.length, 1)
  t.is(response.workers[0].workerId, 'worker-1')
})

test('ipc-gateway - handles multiple envelopes on same connection', async (t) => {
  const mocks = createMockModules()
  const sockPath = path.join(os.tmpdir(), `mdk-test-multi-${Date.now()}.sock`)
  const gateway = new IPCGateway({ ...mocks, path: sockPath })

  await gateway.start()
  t.teardown(() => gateway.stop())

  const responses = await new Promise((resolve, reject) => {
    const results = []
    const client = net.connect(sockPath, () => {
      // Send two envelopes in quick succession
      const env1 = buildEnvelope({
        action: 'worker.list',
        type: MESSAGE_TYPES.REQUEST,
        sender: 'test:ipc:1',
        payload: {}
      })
      const env2 = buildEnvelope({
        action: 'device.capabilities',
        type: MESSAGE_TYPES.REQUEST,
        sender: 'test:ipc:1',
        deviceId: 'wm001',
        payload: {}
      })
      client.write(JSON.stringify(env1) + '\n')
      client.write(JSON.stringify(env2) + '\n')
    })

    let data = ''
    client.on('data', (chunk) => {
      data += chunk.toString()
      let idx
      while ((idx = data.indexOf('\n')) !== -1) {
        const line = data.slice(0, idx)
        data = data.slice(idx + 1)
        if (line.trim()) results.push(JSON.parse(line))
        if (results.length === 2) {
          client.end()
          resolve(results)
        }
      }
    })
    client.on('error', reject)
  })

  t.is(responses.length, 2, 'got 2 responses')
  t.ok(responses[0].workers, 'first is worker.list')
  t.ok(responses[1].capabilities, 'second is device.capabilities')
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
    sender: 'ork:kernel:test',
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
    sender: 'ork',
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
    sender: 'ork',
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

  // Create ORK-side WorkerChannel with its own RPC instance
  const orkDht = new DHT()
  const orkRpc = new HyperswarmRPC({ dht: orkDht })
  const wc = new WorkerChannel({ timeout: 10000, rpc: orkRpc })

  t.teardown(async () => {
    await workerServer.close()
    await workerRpc.destroy()
    await workerDht.destroy()
    await orkRpc.destroy()
    await orkDht.destroy()
  })

  // Connect to worker
  const channel = wc.connect({ rpcKey: workerServer.publicKey })

  // Send health.ping
  const pingEnv = buildEnvelope({
    action: ACTIONS.HEALTH_PING,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'ork:kernel:test',
    payload: {}
  })
  const pingResp = await wc.send(channel, pingEnv)
  t.is(pingResp.payload.status, 'OK', 'health ping works over HRPC')

  // Send telemetry.pull
  const telEnv = buildEnvelope({
    action: ACTIONS.TELEMETRY_PULL,
    type: MESSAGE_TYPES.REQUEST,
    sender: 'ork:kernel:test',
    deviceId: 'wm001',
    payload: { deviceId: 'wm001', query: { type: 'metrics' } }
  })
  const telResp = await wc.send(channel, telEnv)
  t.is(telResp.payload.metrics.hashrate, 95.5, 'telemetry pull works over HRPC')
})
