'use strict'

const test = require('brittle')
const crypto = require('crypto')
const DHT = require('hyperdht')
const { HRPCListener } = require('../../../kernel/lib/transport/hrpc-listener')
const { createTestAuth } = require('../../../kernel/lib/testing')
const { createAssertion } = require('@tetherto/mdk-identity')
const { createRawMdkClient, createMdkClient } = require('../../index')

function createMockModules () {
  const workers = [
    { workerId: 'worker-1', deviceIds: ['wm001', 'wm002'], state: 'READY', healthState: 'HEALTHY' }
  ]
  return {
    dispatcher: {
      async dispatch (envelope) {
        return { commandId: 'cmd-1', status: 'QUEUED', deviceId: envelope.deviceId, command: envelope.payload.command }
      }
    },
    telemetryCollector: {
      async pull (deviceId, query) {
        return { deviceId, metrics: { stats: { hashrate_mhs: { avg: 90 } } }, queryType: query && query.type }
      }
    },
    registry: {
      listWorkers () { return workers },
      getCapabilities (deviceId) { return { commands: [{ name: 'setPowerMode' }] } }
    },
    actionManager: {
      pushAction: async () => ({ id: 1, errors: [] }),
      pushActionsBatch: async () => [],
      getAction: async () => ({}),
      getActionsBatch: async () => [],
      queryActions: async () => ({}),
      voteAction: async () => 1,
      cancelActionsBatch: async () => []
    }
  }
}

// Every Kernel request needs an access token: each listener gets a test issuer
// and policy, and its clients sign in with the credential it hands back.
let credential = null
let lastAuth = null
// The Kernel admits callers by key (there is no allowAll): the tests' clients dial with this one.
const CLIENT_KP = DHT.keyPair(crypto.randomBytes(32))
async function authedListener (t, opts) {
  const auth = await createTestAuth({ registry: opts.registry })
  t.teardown(() => auth.close())
  credential = auth.credential
  lastAuth = auth
  const { allowAll, ...rest } = opts
  const whitelist = allowAll ? [CLIENT_KP.publicKey.toString('hex')] : rest.whitelist
  return new HRPCListener({ ...rest, whitelist, identity: auth.identity, authorizer: auth.authorizer })
}

async function startListener (t) {
  const listener = await authedListener(t, { ...createMockModules(), allowAll: true })
  const { publicKey } = await listener.start()
  t.teardown(() => listener.stop())
  return { listener, publicKey }
}

test('hrpc client - createRawMdkClient over HRPC exposes the full method surface', async (t) => {
  const { publicKey } = await startListener(t)

  const client = createRawMdkClient({ hrpc: { key: publicKey, keyPair: CLIENT_KP }, credential })
  await client.connect()
  t.teardown(() => client.close())

  for (const m of [
    'connect', 'close', 'listWorkers', 'getCapabilities', 'pullTelemetry', 'pullState',
    'sendCommand', 'terminateWorker', 'pushAction', 'pushActionsBatch', 'getAction',
    'getActionsBatch', 'queryActions', 'voteAction', 'cancelActionsBatch'
  ]) {
    t.is(typeof client[m], 'function', `has ${m}()`)
  }
})

test('hrpc client - worker.list round-trips through the RPC listener', async (t) => {
  const { publicKey } = await startListener(t)

  const client = createRawMdkClient({ hrpc: { key: publicKey.toString('hex'), keyPair: CLIENT_KP }, credential })
  await client.connect()
  t.teardown(() => client.close())

  const res = await client.listWorkers()
  t.ok(res.workers, 'response has workers')
  t.is(res.workers.length, 1)
  t.is(res.workers[0].workerId, 'worker-1')
})

test('hrpc client - telemetry pull and command request carry payload + deviceId', async (t) => {
  const { publicKey } = await startListener(t)

  const client = createRawMdkClient({ hrpc: { key: publicKey, keyPair: CLIENT_KP }, credential })
  await client.connect()
  t.teardown(() => client.close())

  const tel = await client.pullTelemetry('wm001', 'metrics')
  t.is(tel.deviceId, 'wm001', 'deviceId routed')
  t.is(tel.queryType, 'metrics', 'query.type forwarded')

  const cmd = await client.sendCommand('wm001', 'setPowerMode', { mode: 'eco' })
  t.is(cmd.status, 'QUEUED')
  t.is(cmd.deviceId, 'wm001')
  t.is(cmd.command, 'setPowerMode', 'command name forwarded in payload')
})

test('hrpc client - action.push round-trips through the RPC listener', async (t) => {
  const calls = []
  const workers = [
    { workerId: 'worker-1', deviceIds: ['wm001'], state: 'READY', healthState: 'HEALTHY' }
  ]
  const listener = await authedListener(t, {
    dispatcher: { async dispatch () { return { status: 'QUEUED' } } },
    telemetryCollector: { async pull () { return {} }, async pullState () { return {} } },
    registry: {
      listWorkers () { return workers },
      getCapabilities () { return { commands: [] } }
    },
    actionManager: {
      pushAction: async (payload) => {
        calls.push(payload)
        return { id: 77, data: { id: 77 }, errors: [] }
      }
    },
    allowAll: true
  })
  const { publicKey } = await listener.start()
  t.teardown(() => listener.stop())

  const client = createRawMdkClient({ hrpc: { key: publicKey, keyPair: CLIENT_KP }, credential })
  await client.connect()
  t.teardown(() => client.close())

  const res = await client.pushAction({
    query: { id: 'wm001' },
    action: 'reboot',
    params: [],
    voter: 'user@example.com',
    authPerms: ['miner:w']
  })

  t.is(calls.length, 1)
  t.is(calls[0].action, 'reboot')
  t.is(res.id, 77)
})

test('hrpc client - concurrent requests all resolve correctly', async (t) => {
  const { publicKey } = await startListener(t)

  const client = createRawMdkClient({ hrpc: { key: publicKey, keyPair: CLIENT_KP }, credential })
  await client.connect()
  t.teardown(() => client.close())

  const results = await Promise.all([
    client.listWorkers(),
    client.pullTelemetry('wm002', 'metrics'),
    client.listWorkers()
  ])
  t.is(results[0].workers.length, 1)
  t.is(results[1].deviceId, 'wm002')
  t.is(results[2].workers.length, 1)
})

test('hrpc client - missing key throws ERR_MDK_CLIENT_HRPC_KEY_REQUIRED', (t) => {
  t.exception(() => createRawMdkClient({ hrpc: {} }), /ERR_MDK_CLIENT_HRPC_KEY_REQUIRED/)
})

test('hrpc client - no transport throws ERR_MDK_CLIENT_TRANSPORT_REQUIRED', (t) => {
  t.exception(() => createRawMdkClient({}), /ERR_MDK_CLIENT_TRANSPORT_REQUIRED/)
})

test('hrpc client - removed ipc option no longer selects a transport', (t) => {
  t.exception(() => createRawMdkClient({ ipc: '/tmp/kernel.sock' }), /ERR_MDK_CLIENT_TRANSPORT_REQUIRED/)
})

test('hrpc client - kernelKeyPair pins the caller key the Kernel allowlist sees', async (t) => {
  const keyPair = DHT.keyPair(crypto.randomBytes(32))
  const callerKey = keyPair.publicKey.toString('hex')
  const listener = await authedListener(t, { ...createMockModules(), whitelist: [callerKey] })
  const { publicKey } = await listener.start()
  t.teardown(() => listener.stop())

  const mdkClient = createMdkClient({ kernelKey: publicKey.toString('hex'), kernelKeyPair: () => keyPair, kernelCredential: credential })
  t.teardown(() => mdkClient.close())

  const res = await mdkClient.listWorkers()
  t.is(res.workers.length, 1, 'admitted by an allowlist that names only that keypair')
})

test('hrpc client - every request carries the default 30s timeout, overridable per client and per call', async (t) => {
  const { HRPCClient, DEFAULT_TIMEOUT_MS } = require('../../lib/hrpc-client')
  t.is(DEFAULT_TIMEOUT_MS, 30000)
  const seen = []
  const rpc = { request: async (key, method, buf, opts) => { seen.push(opts); return Buffer.from('{}') } }

  const client = createRawMdkClient({ hrpc: { key: 'ab'.repeat(32), rpc } })
  await client.connect()
  await client.listWorkers()
  await client.sendCommand('d1', 'reboot', {}, { timeout: 500 })
  t.alike(seen, [{ timeout: 30000 }, { timeout: 500 }])

  const custom = createRawMdkClient({ hrpc: { key: 'ab'.repeat(32), rpc, timeout: 2000 } })
  await custom.connect()
  await custom.pullState('d1')
  t.alike(seen[2], { timeout: 2000 })

  t.exception(() => new HRPCClient({ key: 'ab'.repeat(32), timeout: 0 }), /ERR_MDK_CLIENT_TIMEOUT_INVALID/)
  t.exception(() => new HRPCClient({ key: 'ab'.repeat(32), timeout: 'soon' }), /ERR_MDK_CLIENT_TIMEOUT_INVALID/)
})

test('hrpc client - a hung peer rejects with ERR_MDK_REQUEST_TIMEOUT', async (t) => {
  const rpc = { request: () => new Promise(() => {}) }
  const client = createRawMdkClient({ hrpc: { key: 'ab'.repeat(32), rpc, timeout: 50 } })
  await client.connect()
  try {
    await client.listWorkers()
    t.fail('should have timed out')
  } catch (err) {
    t.is(err.message, 'ERR_MDK_REQUEST_TIMEOUT')
    t.is(err.code, 'ERR_MDK_REQUEST_TIMEOUT')
  }
})

test('hrpc client - createMdkClient passes opts.timeout to the transport', async (t) => {
  const { publicKey } = await startListener(t)
  const mdkClient = createMdkClient({ kernelKey: publicKey.toString('hex'), kernelKeyPair: CLIENT_KP, kernelCredential: credential }, { timeout: 1 })
  t.teardown(() => mdkClient.close())
  // 1 ms cannot cover a DHT round trip, so the configured bound is what fires.
  await t.exception(() => mdkClient.listWorkers(), /ERR_MDK_REQUEST_TIMEOUT/)
})

test('hrpc client - worker clients dial a Worker with the parent kernelKeyPair', async (t) => {
  const HyperswarmRPC = require('@hyperswarm/rpc')
  const { serialize, deserialize, buildResponse } = require('../../../kernel/lib/protocol/envelope')
  const { ACTIONS } = require('../../../kernel/lib/protocol/actions')

  const keyPair = DHT.keyPair(crypto.randomBytes(32))
  const callerKey = keyPair.publicKey.toString('hex')

  // A stand-in Worker RPC server whose firewall admits only the caller key.
  const workerRpc = new HyperswarmRPC()
  const seenKeys = []
  const server = workerRpc.createServer({
    firewall: (remotePublicKey) => {
      seenKeys.push(remotePublicKey.toString('hex'))
      return remotePublicKey.toString('hex') !== callerKey
    }
  })
  server.respond('mdk', async (buf) => {
    const env = deserialize(buf)
    return serialize(buildResponse(env, ACTIONS.COMMAND_RESULT, { status: 'SUCCESS' }, 'w1'))
  })
  await server.listen()
  t.teardown(async () => { await server.close(); await workerRpc.destroy() })

  const mods = createMockModules()
  mods.registry.listWorkers = () => [{ workerId: 'w1', state: 'READY', deviceIds: ['d1'], rpcKey: server.publicKey.toString('hex') }]
  const listener = await authedListener(t, { ...mods, whitelist: [callerKey] })
  const { publicKey } = await listener.start()
  t.teardown(() => listener.stop())

  const mdkClient = createMdkClient({ kernelKey: publicKey.toString('hex'), kernelKeyPair: () => keyPair, kernelCredential: credential })
  t.teardown(() => mdkClient.close())

  const res = await mdkClient.sendWorkerCommand('w1', 'd1', 'reboot', {})
  t.is(res.payload.status, 'SUCCESS', 'admitted by a Worker firewall that names only the kernelKeyPair')
  t.ok(seenKeys.length > 0 && seenKeys.every((k) => k === callerKey), 'the Worker only ever saw the parent key')
})

test('hrpc client - a request without a token is refused; a credential signs in once and is reused', async (t) => {
  const { publicKey } = await startListener(t)

  const anonymous = createRawMdkClient({ hrpc: { key: publicKey, keyPair: CLIENT_KP } })
  await anonymous.connect()
  t.teardown(() => anonymous.close())
  await t.exception(anonymous.listWorkers(), /ERR_KERNEL_TOKEN_REQUIRED/, 'a refusal is thrown, not returned as data')
  t.ok((await anonymous.getJwks()).keys.length, 'sign-in actions need no token')

  const client = createRawMdkClient({ hrpc: { key: publicKey, keyPair: CLIENT_KP }, credential })
  await client.connect()
  t.teardown(() => client.close())
  t.is((await client.listWorkers()).workers.length, 1)
  t.is((await client.listWorkers()).workers.length, 1)
})

test('hrpc client - a rejected token is renewed and the request retried once', async (t) => {
  const { publicKey } = await startListener(t)
  let handed = 0
  const tokenSource = {
    reset () {},
    async getToken () {
      handed++
      if (handed === 1) return 'not.a.token'
      const assertion = createAssertion({ name: credential.name, privateKey: credential.privateKey })
      return (await lastAuth.identity.token({ assertion })).accessToken
    }
  }
  const client = createRawMdkClient({ hrpc: { key: publicKey, keyPair: CLIENT_KP }, tokenSource })
  await client.connect()
  t.teardown(() => client.close())
  t.is((await client.listWorkers()).workers.length, 1)
  t.is(handed, 2)
})

test('hrpc client - bootstrap and dhtHost are handed to child clients before connect', (t) => {
  const { HRPCClient } = require('../../lib/hrpc-client')
  const client = new HRPCClient({ key: 'ab'.repeat(32), seed: Buffer.alloc(32, 7), bootstrap: ['127.0.0.1:49737'], dhtHost: '127.0.0.1' })
  t.alike(client.childOpts(), { timeout: 30000, seed: Buffer.alloc(32, 7), bootstrap: ['127.0.0.1:49737'], dhtHost: '127.0.0.1' })
})
