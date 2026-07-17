'use strict'

const test = require('brittle')
const crypto = require('crypto')
const createTestnet = require('hyperdht/testnet')
const HyperswarmRPC = require('@hyperswarm/rpc')
const { WorkerRuntime } = require('../..')
const simPlugin = require('../fixtures/sim-plugin')
const { ACTIONS, MESSAGE_TYPES } = require('../../../kernel/lib/protocol/actions')
const { build, serialize, deserialize } = require('../../../kernel/lib/protocol/envelope')

test('runtime serves MDK envelopes for N devices over one HRPC channel', { timeout: 60000 }, async (t) => {
  const testnet = await createTestnet(3, t.teardown)

  const runtime = new WorkerRuntime(simPlugin, {
    workerId: 'sim-rack-1',
    kernelTopic: crypto.randomBytes(32).toString('hex'),
    bootstrap: testnet.bootstrap,
    devices: [
      { deviceId: 'SIM-001', config: { hashrate: 100, power: 3000 } },
      { deviceId: 'SIM-002', config: { hashrate: 140, power: 3200 } }
    ]
  })
  await runtime.start()
  t.teardown(() => runtime.stop())

  const rpc = new HyperswarmRPC({ bootstrap: testnet.bootstrap })
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
