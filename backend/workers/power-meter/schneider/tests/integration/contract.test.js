'use strict'

const test = require('brittle')
const { once } = require('node:events')
const path = require('path')
const { loadContract, createInstance } = require('@tetherto/mdk-worker')
const mockServer = require('../../mock/server')

const PKG_DIR = path.join(__dirname, '..', '..')

async function startMock (t, type) {
  const mock = mockServer.createServer({ host: '127.0.0.1', port: 0, type })
  await once(mock.server, 'listening')
  t.teardown(() => mock.exit())
  return mock.server.address().port
}

function instanceFor (id, opts, config = {}) {
  const { dir, entries } = loadContract(PKG_DIR)
  return createInstance({ dir, entries, device: { id, opts, env: {}, config, workerId: 'schneider-test' } })
}

test('contract loads from the package root with every declared handler', (t) => {
  const { contract, entries, publishedContract } = loadContract(PKG_DIR)
  t.is(contract.metadata.provider, 'schneider')
  t.is(entries.telemetry.size, 6)
  t.is(entries.commands.size, 0)
  for (const entry of publishedContract.capabilities.telemetry) {
    t.is(entry.handler, undefined, `${entry.name} handler path stripped from published contract`)
  }
})

test('device load validates the config and the model', (t) => {
  t.exception(() => instanceFor('x', { address: '127.0.0.1', port: 502 }), /ERR_DEVICE_CONFIG_INVALID/)
  t.exception(() => instanceFor('x', { address: '127.0.0.1', port: 502, unitId: 1, model: 'bogus' }), /ERR_MODEL_INVALID/)
})

test('pm5340: snap and channels read Modbus registers', async (t) => {
  const port = await startMock(t, 'pm5340')
  const instance = instanceFor('SCH-T1', { address: '127.0.0.1', port, unitId: 1, model: 'pm5340' })

  const snap = await instance.telemetry.get('snap')({})
  t.is(snap.success, true)
  t.ok(typeof snap.stats.power_w === 'number')
  t.ok(typeof snap.stats.tension_v === 'number')
  t.ok(snap.stats.powermeter_specific.instantaneous_values)

  for (const name of ['voltage', 'current', 'active_power', 'power_factor', 'frequency']) {
    const value = await instance.telemetry.get(name)({})
    t.ok(typeof value === 'number', `${name} = ${value}`)
  }
})

test('p3u30: snap and channels read Modbus registers', async (t) => {
  const port = await startMock(t, 'p3u30')
  const instance = instanceFor('SCH-T2', { address: '127.0.0.1', port, unitId: 1, type: 'powermeter-schneider-p3u30' })

  const snap = await instance.telemetry.get('snap')({})
  t.is(snap.success, true)
  t.ok(typeof snap.stats.power_w === 'number')

  const power = await instance.telemetry.get('active_power')({})
  t.ok(typeof power === 'number', `active_power ${power} W`)
  t.is(await instance.telemetry.get('current')({}), 0, 'p3u30 has no current registers')
})

test('host is an alias for address and the worker config can carry the model', async (t) => {
  const port = await startMock(t, 'pm5340')
  const instance = instanceFor('SCH-T3', { host: '127.0.0.1', port, unitId: 1 }, { model: 'pm5340', conf: { timeout: 2000 } })
  const snap = await instance.telemetry.get('snap')({})
  t.is(snap.success, true)
})

test('an unreachable meter fails every channel with ERR_METER_UNREACHABLE', async (t) => {
  const mock = mockServer.createServer({ host: '127.0.0.1', port: 0, type: 'pm5340' })
  await once(mock.server, 'listening')
  const port = mock.server.address().port
  mock.exit()
  const instance = instanceFor('SCH-DOWN', { address: '127.0.0.1', port, unitId: 1, model: 'pm5340', timeout: 1000 })

  await t.exception(instance.telemetry.get('snap')({}), /ERR_METER_UNREACHABLE/)
  await t.exception(instance.telemetry.get('voltage')({}), /ERR_METER_UNREACHABLE/)
})
