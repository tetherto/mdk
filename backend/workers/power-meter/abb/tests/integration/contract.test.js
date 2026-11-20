'use strict'

const test = require('brittle')
const { once } = require('node:events')
const path = require('path')
const { loadContract, createInstance } = require('@tetherto/mdk-worker')
const mockServer = require('../../mock/server')

const PKG_DIR = path.join(__dirname, '..', '..')

async function startMock (t, type = 'b23') {
  const mock = mockServer.createServer({ host: '127.0.0.1', port: 0, type })
  await once(mock.server, 'listening')
  t.teardown(() => mock.exit())
  return mock.server.address().port
}

function instanceFor (id, opts, config = {}) {
  const { dir, entries } = loadContract(PKG_DIR)
  return createInstance({ dir, entries, device: { id, opts, env: {}, config, workerId: 'abb-test' } })
}

test('contract loads from the package root with every declared handler', (t) => {
  const { contract, entries, publishedContract } = loadContract(PKG_DIR)
  t.is(contract.metadata.provider, 'abb')
  t.is(entries.telemetry.size, 9)
  t.is(entries.commands.size, 0)
  for (const entry of publishedContract.capabilities.telemetry) {
    t.is(entry.handler, undefined, `${entry.name} handler path stripped from published contract`)
  }
})

test('device load validates the config and the model', (t) => {
  t.exception(() => instanceFor('x', { address: '127.0.0.1', port: 5020 }), /ERR_DEVICE_CONFIG_INVALID/)
  t.exception(() => instanceFor('x', { address: '127.0.0.1', port: 5020, unitId: 0, model: 'bogus' }), /ERR_MODEL_INVALID/)
  t.exception(() => instanceFor('x', { address: '127.0.0.1', port: 5020, unitId: 0 }), /ERR_MODEL_INVALID/)
})

test('b23: snap and channels read Modbus registers', async (t) => {
  const port = await startMock(t)
  const instance = instanceFor('ABB-T1', { address: '127.0.0.1', port, unitId: 0, model: 'b23' })

  const snap = await instance.telemetry.get('snap')({})
  t.is(snap.success, true)
  t.ok(typeof snap.stats.power_w === 'number')
  t.ok(typeof snap.stats.tension_v === 'number')
  t.ok(snap.stats.powermeter_specific)

  const v1 = await instance.telemetry.get('voltage_v1')({})
  t.ok(typeof v1 === 'number' && v1 > 0, `voltage_v1 ${v1} V`)
  for (const name of ['voltage_v2', 'voltage_v3', 'current_i1', 'current_i2', 'current_i3', 'active_power', 'reactive_power']) {
    const value = await instance.telemetry.get(name)({})
    t.ok(typeof value === 'number', `${name} = ${value}`)
  }
})

test('the model comes from the legacy type tag or the worker config too', async (t) => {
  const port = await startMock(t)
  const byType = instanceFor('ABB-T2', { address: '127.0.0.1', port, unitId: 0, type: 'powermeter-abb-b24' })
  const byConfig = instanceFor('ABB-T3', { address: '127.0.0.1', port, unitId: 0 }, { model: 'b23' })
  t.ok(typeof await byType.telemetry.get('active_power')({}) === 'number')
  t.ok(typeof await byConfig.telemetry.get('active_power')({}) === 'number')
})

test('an unreachable meter fails every channel with ERR_METER_UNREACHABLE', async (t) => {
  const mock = mockServer.createServer({ host: '127.0.0.1', port: 0, type: 'b23' })
  await once(mock.server, 'listening')
  const port = mock.server.address().port
  mock.exit()
  const instance = instanceFor('ABB-DOWN', { address: '127.0.0.1', port, unitId: 0, model: 'b23', timeout: 1000 })

  await t.exception(instance.telemetry.get('snap')({}), /ERR_METER_UNREACHABLE/)
  await t.exception(instance.telemetry.get('active_power')({}), /ERR_METER_UNREACHABLE/)
})
