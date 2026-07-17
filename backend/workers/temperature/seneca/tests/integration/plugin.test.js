'use strict'

const test = require('brittle')
const { setTimeout: sleep } = require('timers/promises')
const plugin = require('../../plugin')
const mockServer = require('../../mock/server')
const { loadPlugin } = require('../../../../../core/mdk-worker/lib/plugin-loader')

const MOCK_PORT = 14100

async function createDevice (t, opts = {}) {
  const port = opts.port || MOCK_PORT
  const mock = mockServer.createServer({
    host: '127.0.0.1',
    port,
    type: 'seneca'
  })
  await sleep(500)

  const config = {
    address: '127.0.0.1',
    port,
    unitId: 0,
    register: 3,
    type: 'sensor-temp-seneca-temp-seneca'
  }
  const device = await plugin.connect(config, { deviceId: 'SEN-T1' })

  t.teardown(async () => {
    await plugin.disconnect(device)
    mock.exit()
  })

  return { device, ctx: Object.freeze({ deviceId: 'SEN-T1', device, config, services: null }) }
}

function handler (section, name) {
  return loadPlugin(plugin).handlers[section].get(name)
}

test('plugin loads: every contract entry has a working handler module', (t) => {
  const loaded = loadPlugin(plugin)
  t.is(loaded.handlers.telemetry.size, 2)
  t.is(loaded.handlers.commands.size, 0)
  for (const entry of loaded.publishedContract.capabilities.telemetry) {
    t.is(entry.handler, undefined, `${entry.name} handler path stripped from published contract`)
  }
})

test('connect validates the device config', async (t) => {
  await t.exception(plugin.connect({ address: '127.0.0.1', port: 502, unitId: 0 }, { deviceId: 'x' }), /ERR_DEVICE_CONFIG_INVALID/)
})

test('snap and temperature channel read the sensor register', async (t) => {
  const { ctx } = await createDevice(t)

  const snap = await handler('telemetry', 'snap')(ctx, {})
  t.is(snap.success, true)
  t.ok(typeof snap.stats.temp_c === 'number')
  t.ok(['ok', 'error'].includes(snap.stats.status))

  const temperature = await handler('telemetry', 'temperature')(ctx, {})
  t.ok(typeof temperature === 'number', `temperature ${temperature} C`)
})
