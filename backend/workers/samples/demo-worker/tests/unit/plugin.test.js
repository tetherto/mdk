'use strict'

// Plugin-level contract test: exercises the Worker Plugin (contract + connect
// + handlers) directly against the firmware v3 mock, with no WorkerRuntime in
// the loop — demo-worker never depends on it. Hosting the plugin on
// WorkerRuntime (envelope dispatch, multi-device routing, the sampler loop)
// is covered by the caller example's own tests, see
// examples/backend/demo-worker-caller/tests/unit/worker.test.js.

const test = require('brittle')
const os = require('os')
const path = require('path')
const net = require('net')

const plugin = require('../../plugin')
const { openDb } = require('../../lib/db')
const demoMock = require('../../mock/server')
const { loadPlugin } = require('../../../../../core/mdk-worker/lib/plugin-loader')

function freePort () {
  return new Promise((resolve, reject) => {
    const s = net.createServer()
    s.once('error', reject)
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address()
      s.close(() => resolve(port))
    })
  })
}

function handler (section, name) {
  return loadPlugin(plugin).handlers[section].get(name)
}

async function createDevice (t, opts = {}) {
  const port = opts.port || (await freePort())
  const mock = demoMock.createServer({ host: '127.0.0.1', port, serial: opts.serial || 'WM3-T1', hashrateThs: opts.hashrateThs, powerW: opts.powerW })
  t.teardown(() => mock.exit())

  const dbPath = path.join(os.tmpdir(), `demo-worker-plugin-test-${Date.now()}-${process.pid}-${Math.random().toString(36).slice(2)}.db`)
  const config = { host: '127.0.0.1', port, dbPath }
  const device = await plugin.connect(config, { deviceId: 'v3-0' })
  t.teardown(() => device.db.close())

  return { mock, device, ctx: Object.freeze({ deviceId: 'v3-0', device, config, services: null }) }
}

test('plugin loads: every contract entry has a working handler module', (t) => {
  const loaded = loadPlugin(plugin)
  t.is(loaded.handlers.telemetry.size, 5)
  t.is(loaded.handlers.commands.size, 2)
  for (const entry of loaded.publishedContract.capabilities.telemetry) {
    t.is(entry.handler, undefined, `${entry.name} handler path stripped from published contract`)
  }
})

test('connect probes the device and throws when it is unreachable', async (t) => {
  const port = await freePort()
  const dbPath = path.join(os.tmpdir(), `demo-worker-plugin-test-offline-${Date.now()}.db`)
  t.teardown(() => openDb(dbPath).close())
  // Nothing is listening on this port — WorkerRuntime relies on connect()
  // rejecting to hold the device offline instead of taking the runtime down.
  // fetch's connection-refused rejection is a TypeError, which plain
  // t.exception treats as an uncaught bug rather than an expected rejection.
  await t.exception.all(plugin.connect({ host: '127.0.0.1', port, dbPath }, { deviceId: 'v3-x' }))
})

test('telemetry handlers translate the v3 firmware summary', async (t) => {
  const { ctx } = await createDevice(t, { hashrateThs: 200, powerW: 3500 })

  const hashrate = await handler('telemetry', 'hashrate_rt')(ctx, {})
  t.ok(hashrate > 190 && hashrate < 210, `hashrate_rt ${hashrate} TH/s`)

  const power = await handler('telemetry', 'power')(ctx, {})
  t.ok(power > 3400 && power < 3600, `power ${power} W`)

  const temperature = await handler('telemetry', 'temperature')(ctx, {})
  t.ok(typeof temperature === 'number', `temperature ${temperature} C`)

  const powerMode = await handler('telemetry', 'power_mode')(ctx, {})
  t.is(powerMode, 'normal', 'power_mode defaults to normal')
})

test('setPowerMode command dispatches to the firmware and records a SQLite audit row', async (t) => {
  const { ctx, mock } = await createDevice(t)

  const result = await handler('commands', 'setPowerMode')(ctx, { mode: 'eco' })
  t.is(result.power_mode, 'eco', 'firmware switched to eco')
  t.is(mock.state.powerMode, 'eco', 'mock state updated')

  const audit = ctx.device.db.recentCommands(ctx.deviceId, 5)
  t.is(audit.length, 1, 'one audit row recorded')
  t.is(audit[0].command, 'setPowerMode')
  t.is(audit[0].params.mode, 'eco')

  // The site UI's low mode is translated to the firmware's eco.
  const alias = await handler('commands', 'setPowerMode')(ctx, { mode: 'low' })
  t.is(alias.power_mode, 'eco', 'low alias mapped onto the firmware eco mode')
})

test('reboot command records an audit row', async (t) => {
  const { ctx } = await createDevice(t)

  const result = await handler('commands', 'reboot')(ctx, {})
  t.is(result.rebooting, true)

  const audit = ctx.device.db.recentCommands(ctx.deviceId, 5)
  t.is(audit.length, 1)
  t.is(audit[0].command, 'reboot')
})

test('history channel reads back rows written to the worker\'s own SQLite store', async (t) => {
  const { ctx } = await createDevice(t)

  ctx.device.db.recordSample(ctx.deviceId, { hashrate_ths: 200, power_w: 3500, board_temp_c: 60 })
  ctx.device.db.recordSample(ctx.deviceId, { hashrate_ths: 202, power_w: 3510, board_temp_c: 61 })

  const rows = await handler('telemetry', 'history')(ctx, { limit: 1 })
  t.is(rows.length, 1, 'limit respected')
  t.ok(typeof rows[0].hashrate_ths === 'number' && typeof rows[0].power_w === 'number', 'row carries the sampled fields')
})

test('firmware error surfaces with the contract error code', async (t) => {
  const { ctx } = await createDevice(t)

  await t.exception(handler('commands', 'setPowerMode')(ctx, { mode: 'ludicrous' }), /ERR_BAD_POWER_MODE/)
})

test('two devices sharing a dbPath keep independent command audit trails', async (t) => {
  const portA = await freePort()
  const portB = await freePort()
  const mockA = demoMock.createServer({ host: '127.0.0.1', port: portA, serial: 'WM3-A' })
  const mockB = demoMock.createServer({ host: '127.0.0.1', port: portB, serial: 'WM3-B' })
  t.teardown(() => { mockA.exit(); mockB.exit() })

  const dbPath = path.join(os.tmpdir(), `demo-worker-plugin-test-shared-${Date.now()}.db`)
  const deviceA = await plugin.connect({ host: '127.0.0.1', port: portA, dbPath }, { deviceId: 'v3-a' })
  const deviceB = await plugin.connect({ host: '127.0.0.1', port: portB, dbPath }, { deviceId: 'v3-b' })
  t.teardown(() => openDb(dbPath).close())

  const ctxA = Object.freeze({ deviceId: 'v3-a', device: deviceA, config: { dbPath }, services: null })
  await handler('commands', 'setPowerMode')(ctxA, { mode: 'eco' })

  t.is(deviceA.db.recentCommands('v3-a', 5).length, 1, 'addressed device has one audit row')
  t.is(deviceB.db.recentCommands('v3-b', 5).length, 0, 'sibling device unaffected')
})
