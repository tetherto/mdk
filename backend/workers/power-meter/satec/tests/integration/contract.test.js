'use strict'

const test = require('brittle')
const { once } = require('node:events')
const path = require('path')
const { loadContract, createInstance } = require('@tetherto/mdk-worker')
const mockServer = require('../../mock/server')

const PKG_DIR = path.join(__dirname, '..', '..')

async function startMock (t, ctx = {}) {
  const mock = mockServer.createServer({ host: '127.0.0.1', port: 0, type: 'pm180', ...ctx })
  await once(mock.server, 'listening')
  t.teardown(() => mock.exit())
  return { mock, port: mock.server.address().port }
}

function instanceFor (id, opts, config = {}) {
  const { dir, entries } = loadContract(PKG_DIR)
  return createInstance({ dir, entries, device: { id, opts, env: {}, config, workerId: 'satec-test' } })
}

function telemetryCounter () {
  let requests = 0
  return {
    count: () => requests,
    telemetry: { id: () => null, sendRequest: () => { requests++ }, sendResponse: () => {} }
  }
}

test('contract loads from the package root with every declared handler', (t) => {
  const { contract, entries, publishedContract } = loadContract(PKG_DIR)
  t.is(contract.metadata.provider, 'satec')
  t.is(entries.telemetry.size, 6)
  t.is(entries.commands.size, 0)
  for (const entry of publishedContract.capabilities.telemetry) {
    t.is(entry.handler, undefined, `${entry.name} handler path stripped from published contract`)
  }
})

test('telemetry channels read the mock meter', async (t) => {
  const { port } = await startMock(t)
  const instance = instanceFor('SATEC-T1', { address: '127.0.0.1', port, unitId: 1 })

  const snap = await instance.telemetry.get('snap')({})
  t.is(snap.success, true)
  t.ok(typeof snap.stats.power_w === 'number')
  t.ok(typeof snap.stats.tension_v === 'number')
  t.ok(snap.stats.powermeter_specific.instantaneous_values)
  t.ok(snap.stats.powermeter_specific.historical_values)

  for (const name of ['voltage', 'current', 'active_power', 'power_factor']) {
    const value = await instance.telemetry.get(name)({})
    t.ok(typeof value === 'number' && value > 0, `${name} = ${value}`)
  }
  t.is(await instance.telemetry.get('frequency')({}), 0)
})

test('channels of one sweep share a single Modbus read', async (t) => {
  const counter = telemetryCounter()
  const { port } = await startMock(t, counter)
  const instance = instanceFor('SATEC-T2', { address: '127.0.0.1', port, unitId: 1 })

  // The runtime hands one params object to every handler of a sweep.
  const sweep = {}
  for (const name of ['snap', 'voltage', 'current', 'active_power', 'power_factor', 'frequency']) {
    await instance.telemetry.get(name)(sweep)
  }
  // one getSnap() = three register-block reads
  t.is(counter.count(), 3)

  // A new pull (new params object) reads the meter again.
  await instance.telemetry.get('active_power')({})
  t.is(counter.count(), 6)
})

test('each device gets its own meter instance', async (t) => {
  const a = await startMock(t, { powerW: 10000 })
  const b = await startMock(t, { powerW: 40000 })
  const first = instanceFor('SATEC-A', { address: '127.0.0.1', port: a.port, unitId: 1 })
  const second = instanceFor('SATEC-B', { address: '127.0.0.1', port: b.port, unitId: 1 })

  const powerA = await first.telemetry.get('active_power')({})
  const powerB = await second.telemetry.get('active_power')({})
  t.ok(powerB > powerA, `${powerB} W > ${powerA} W`)
})

test('a device without address, port and unitId fails to load', (t) => {
  t.exception(() => instanceFor('SATEC-X', { address: '127.0.0.1', port: 502 }), /ERR_DEVICE_CONFIG_INVALID/)
})

test('an unreachable meter fails every channel with ERR_METER_UNREACHABLE', async (t) => {
  const { port, mock } = await startMock(t)
  mock.exit()
  const instance = instanceFor('SATEC-DOWN', { address: '127.0.0.1', port, unitId: 1, timeout: 1000 })

  await t.exception(instance.telemetry.get('snap')({}), /ERR_METER_UNREACHABLE/)
  await t.exception(instance.telemetry.get('active_power')({}), /ERR_METER_UNREACHABLE/)
})
