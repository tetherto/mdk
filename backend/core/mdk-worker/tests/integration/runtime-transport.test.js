'use strict'

const test = require('brittle')
const crypto = require('crypto')
const createTestnet = require('hyperdht/testnet')
const HyperswarmRPC = require('@hyperswarm/rpc')
const DHT = require('hyperdht')
const { WorkerRuntime } = require('../..')
const simPlugin = require('../fixtures/sim-plugin')
const { ACTIONS, MESSAGE_TYPES } = require('../../../kernel/lib/protocol/actions')
const { build, serialize, deserialize } = require('../../../kernel/lib/protocol/envelope')

const LOOPBACK = '127.0.0.1'

test('runtime serves MDK envelopes for N devices over one HRPC channel', { timeout: 60000 }, async (t) => {
  const testnet = await createTestnet(4, t.teardown)
  const callerKeyPair = DHT.keyPair()

  const runtime = new WorkerRuntime(simPlugin, {
    workerId: 'sim-rack-1',
    allowedKeys: [callerKeyPair.publicKey.toString('hex')],
    kernelTopic: crypto.randomBytes(32).toString('hex'),
    bootstrap: testnet.bootstrap,
    dhtHost: LOOPBACK,
    devices: [
      { deviceId: 'SIM-001', config: { hashrate: 100, power: 3000 } },
      { deviceId: 'SIM-002', config: { hashrate: 140, power: 3200 } }
    ]
  })
  await runtime.start()
  t.teardown(() => runtime.stop())

  const rpc = new HyperswarmRPC({ keyPair: callerKeyPair, dht: testnet.createNode({ keyPair: callerKeyPair }) })
  t.teardown(() => rpc.destroy())
  const send = async (opts) => {
    const envelope = build({ type: MESSAGE_TYPES.REQUEST, sender: 'kernel:kernel:test', ...opts })
    return deserialize(await rpc.request(runtime.getPublicKey(), 'mdk', serialize(envelope)))
  }

  const identity = await send({ action: ACTIONS.IDENTITY_REQUEST })
  t.is(identity.action, ACTIONS.IDENTITY_RESPONSE)
  t.is(identity.payload.workerId, 'sim-rack-1')
  t.alike(identity.payload.devices, [{ deviceId: 'SIM-001' }, { deviceId: 'SIM-002' }])

  const capability = await send({ action: ACTIONS.CAPABILITY_REQUEST })
  t.ok(capability.payload.contract.capabilities)
  t.is(capability.payload.contract.capabilities.telemetry[0].handler, undefined)

  const telemetry = await send({
    action: ACTIONS.TELEMETRY_PULL,
    deviceId: 'SIM-002',
    payload: { query: { type: 'hashrate_rt' } }
  })
  t.is(telemetry.payload.value, 140)

  const command = await send({
    action: ACTIONS.COMMAND_REQUEST,
    deviceId: 'SIM-001',
    payload: { commandId: 'cmd-wire-1', command: 'setPowerLimit', params: { limit_watts: 2500 } }
  })
  t.is(command.payload.status, 'SUCCESS')
  t.alike(command.payload.result, { deviceId: 'SIM-001', watts: 2500, ok: true })

  const pong = await send({ action: ACTIONS.HEALTH_PING })
  t.is(pong.payload.status, 'OK')
})

function bootRuntime (t, testnet, opts) {
  const runtime = new WorkerRuntime(simPlugin, {
    workerId: 'sim-rack-fw',
    bootstrap: testnet.bootstrap,
    dhtHost: LOOPBACK,
    devices: [{ deviceId: 'SIM-001', config: { hashrate: 100, power: 3000 } }],
    ...opts
  })
  t.teardown(() => runtime.stop())
  return runtime
}

test('runtime refuses to start without an allowlist (fail closed)', async (t) => {
  const testnet = await createTestnet(4, t.teardown)
  const runtime = bootRuntime(t, testnet, {})
  await t.exception(() => runtime.start(), /ERR_WORKER_ALLOWED_KEYS_REQUIRED/)
  t.exception(() => runtime.allowKey('nothex'), /ERR_WORKER_ALLOWED_KEY_INVALID/)
})

test('runtime firewall rejects unknown callers and honours allowKey/revokeKey', { timeout: 60000 }, async (t) => {
  const testnet = await createTestnet(4, t.teardown)
  const allowed = DHT.keyPair()
  const stranger = DHT.keyPair()
  const runtime = bootRuntime(t, testnet, { allowedKeys: [allowed.publicKey] })
  await runtime.start()

  const ping = build({ type: MESSAGE_TYPES.REQUEST, sender: 'kernel:kernel:test', action: ACTIONS.HEALTH_PING })

  const strangerRpc = new HyperswarmRPC({ keyPair: stranger, dht: testnet.createNode({ keyPair: stranger }) })
  t.teardown(() => strangerRpc.destroy())
  await t.exception(() => strangerRpc.request(runtime.getPublicKey(), 'mdk', serialize(ping)), 'unknown key is rejected at connect')

  const rpc = new HyperswarmRPC({ keyPair: allowed, dht: testnet.createNode({ keyPair: allowed }) })
  t.teardown(() => rpc.destroy())
  const pong = deserialize(await rpc.request(runtime.getPublicKey(), 'mdk', serialize(ping)))
  t.is(pong.payload.status, 'OK', 'allowlisted key is served')

  const bad = deserialize(await rpc.request(runtime.getPublicKey(), 'mdk', serialize({ action: ACTIONS.HEALTH_PING })))
  t.is(bad.error, 'ERR_ENVELOPE_ID_MISSING', 'malformed envelopes are refused before dispatch')

  runtime.revokeKey(allowed.publicKey)
  const revoked = deserialize(await rpc.request(runtime.getPublicKey(), 'mdk', serialize(ping)))
  t.is(revoked.error, 'ERR_WORKER_CALLER_NOT_ALLOWED', 'revocation applies to an open connection')
})
