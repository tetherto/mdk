'use strict'

const test = require('brittle')
const { setTimeout: sleep } = require('timers/promises')
const plugin = require('../../plugin')
const mockServer = require('../../mock/server')
const { loadPlugin } = require('../../../../../core/mdk-worker/lib/plugin-loader')

const MOCK_PORT = 14090

async function createDevice (t, opts = {}) {
  const port = opts.port || MOCK_PORT
  const mock = mockServer.createServer({
    host: '127.0.0.1',
    port,
    type: 'pm180'
  })
  await sleep(500)

  const config = {
    address: '127.0.0.1',
    port,
    unitId: 1,
    type: 'powermeter-satec-pm180'
  }
  const device = await plugin.connect(config, { deviceId: 'SATEC-T1' })

  t.teardown(async () => {
    await plugin.disconnect(device)
    mock.exit()
  })

  return { device, ctx: Object.freeze({ deviceId: 'SATEC-T1', device, config, services: null }) }
}

function handler (section, name) {
  return loadPlugin(plugin).handlers[section].get(name)
}

test('plugin loads: every contract entry has a working handler module', (t) => {
  const loaded = loadPlugin(plugin)
  t.is(loaded.handlers.telemetry.size, 6)
  t.is(loaded.handlers.commands.size, 0)
  for (const entry of loaded.publishedContract.capabilities.telemetry) {
    t.is(entry.handler, undefined, `${entry.name} handler path stripped from published contract`)
  }
})

test('connect validates the device config', async (t) => {
  await t.exception(plugin.connect({ address: '127.0.0.1', port: 502 }, { deviceId: 'x' }), /ERR_DEVICE_CONFIG_INVALID/)
})

test('snap handler returns the full legacy snapshot shape', async (t) => {
  const { ctx } = await createDevice(t)

  const snap = await handler('telemetry', 'snap')(ctx, {})
  t.is(snap.success, true)
  t.ok(typeof snap.stats.power_w === 'number')
  t.ok(typeof snap.stats.tension_v === 'number')
  t.ok(snap.stats.powermeter_specific.instantaneous_values)
  t.ok(snap.stats.powermeter_specific.historical_values)
})

test('telemetry channels read Modbus registers', async (t) => {
  const { ctx } = await createDevice(t, { port: MOCK_PORT + 1 })

  const voltage = await handler('telemetry', 'voltage')(ctx, {})
  t.ok(typeof voltage === 'number', `voltage ${voltage} V`)

  const current = await handler('telemetry', 'current')(ctx, {})
  t.ok(typeof current === 'number', `current ${current} A`)

  const power = await handler('telemetry', 'active_power')(ctx, {})
  t.ok(typeof power === 'number', `active_power ${power} W`)

  const pf = await handler('telemetry', 'power_factor')(ctx, {})
  t.ok(typeof pf === 'number', `power_factor ${pf}`)

  const freq = await handler('telemetry', 'frequency')(ctx, {})
  t.is(freq, 0)
})
