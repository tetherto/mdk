'use strict'

const test = require('brittle')
const { setTimeout: sleep } = require('timers/promises')
const plugin = require('../../plugin')
const mockServer = require('../../mock/server')
const { loadPlugin } = require('../../../../../core/mdk-worker/lib/plugin-loader')

const MOCK_PORT = 14085

async function createDevice (t, opts = {}) {
  const port = opts.port || MOCK_PORT
  const mock = mockServer.createServer({
    host: '127.0.0.1',
    port,
    type: opts.type || 'b23'
  })
  await sleep(500)

  const config = {
    address: '127.0.0.1',
    port,
    unitId: 0,
    model: opts.model || 'b23',
    type: `powermeter-abb-${opts.model || 'b23'}`
  }
  const device = await plugin.connect(config, { deviceId: 'ABB-T1' })

  t.teardown(async () => {
    await plugin.disconnect(device)
    mock.exit()
  })

  return { device, ctx: Object.freeze({ deviceId: 'ABB-T1', device, config, services: null }) }
}

function handler (section, name) {
  return loadPlugin(plugin).handlers[section].get(name)
}

test('plugin loads: every contract entry has a working handler module', (t) => {
  const loaded = loadPlugin(plugin)
  t.is(loaded.handlers.telemetry.size, 9)
  t.is(loaded.handlers.commands.size, 0)
  for (const entry of loaded.publishedContract.capabilities.telemetry) {
    t.is(entry.handler, undefined, `${entry.name} handler path stripped from published contract`)
  }
})

test('connect validates the device config', async (t) => {
  await t.exception(plugin.connect({ address: '127.0.0.1', port: 5020 }, { deviceId: 'x' }), /ERR_DEVICE_CONFIG_INVALID/)
  await t.exception(plugin.connect({ address: '127.0.0.1', port: 5020, unitId: 0, model: 'bogus' }, { deviceId: 'x' }), /ERR_MODEL_INVALID/)
})

test('snap handler returns the full legacy snapshot shape', async (t) => {
  const { ctx } = await createDevice(t)

  const snap = await handler('telemetry', 'snap')(ctx, {})
  t.is(snap.success, true)
  t.ok(typeof snap.stats.power_w === 'number')
  t.ok(typeof snap.stats.tension_v === 'number')
  t.ok(snap.stats.powermeter_specific)
})

test('telemetry channels read Modbus registers', async (t) => {
  const { ctx } = await createDevice(t, { port: MOCK_PORT + 1 })

  const v1 = await handler('telemetry', 'voltage_v1')(ctx, {})
  t.ok(typeof v1 === 'number' && v1 > 0, `voltage_v1 ${v1} V`)

  const i1 = await handler('telemetry', 'current_i1')(ctx, {})
  t.ok(typeof i1 === 'number', `current_i1 ${i1} A`)

  const power = await handler('telemetry', 'active_power')(ctx, {})
  t.ok(typeof power === 'number', `active_power ${power} W`)

  const reactive = await handler('telemetry', 'reactive_power')(ctx, {})
  t.ok(typeof reactive === 'number', `reactive_power ${reactive} VAR`)
})
