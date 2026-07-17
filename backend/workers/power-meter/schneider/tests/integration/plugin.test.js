'use strict'

const test = require('brittle')
const { setTimeout: sleep } = require('timers/promises')
const plugin = require('../../plugin')
const mockServer = require('../../mock/server')
const { loadPlugin } = require('../../../../../core/mdk-worker/lib/plugin-loader')

const MOCK_PORT = 14095

async function createDevice (t, opts = {}) {
  const port = opts.port || MOCK_PORT
  const model = opts.model || 'pm5340'
  const mock = mockServer.createServer({
    host: '127.0.0.1',
    port,
    type: model
  })
  await sleep(500)

  const config = {
    address: '127.0.0.1',
    port,
    unitId: 1,
    model,
    type: `powermeter-schneider-${model}`
  }
  const device = await plugin.connect(config, { deviceId: 'SCH-T1' })

  t.teardown(async () => {
    await plugin.disconnect(device)
    mock.exit()
  })

  return { device, ctx: Object.freeze({ deviceId: 'SCH-T1', device, config, services: null }) }
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
  await t.exception(plugin.connect({ address: '127.0.0.1', port: 502, unitId: 1, model: 'bogus' }, { deviceId: 'x' }), /ERR_MODEL_INVALID/)
})

test('pm5340: snap and channels read Modbus registers', async (t) => {
  const { ctx } = await createDevice(t)

  const snap = await handler('telemetry', 'snap')(ctx, {})
  t.is(snap.success, true)
  t.ok(typeof snap.stats.power_w === 'number')
  t.ok(typeof snap.stats.tension_v === 'number')
  t.ok(snap.stats.powermeter_specific.instantaneous_values)

  const voltage = await handler('telemetry', 'voltage')(ctx, {})
  t.ok(typeof voltage === 'number', `voltage ${voltage} V`)

  const current = await handler('telemetry', 'current')(ctx, {})
  t.ok(typeof current === 'number', `current ${current} A`)

  const frequency = await handler('telemetry', 'frequency')(ctx, {})
  t.ok(typeof frequency === 'number', `frequency ${frequency} Hz`)
})

test('p3u30: snap and channels read Modbus registers', async (t) => {
  const { ctx } = await createDevice(t, { port: MOCK_PORT + 1, model: 'p3u30' })

  const snap = await handler('telemetry', 'snap')(ctx, {})
  t.is(snap.success, true)
  t.ok(typeof snap.stats.power_w === 'number')

  const power = await handler('telemetry', 'active_power')(ctx, {})
  t.ok(typeof power === 'number', `active_power ${power} W`)

  const current = await handler('telemetry', 'current')(ctx, {})
  t.is(current, 0, 'p3u30 has no current registers')
})
