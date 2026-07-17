'use strict'

const net = require('net')
const test = require('brittle')
const { promiseSleep } = require('@bitfinex/lib-js-util-promise')
const { Aedes } = require('aedes')
const plugin = require('../../plugin')
const mockServer = require('../../mock/server')
const { loadPlugin } = require('../../../../../core/mdk-worker/lib/plugin-loader')

const BROKER_PORT = 14120
const MOCK_WAIT_MS = 2500

async function createDevice (t, opts = {}) {
  const port = opts.port || BROKER_PORT
  const containerId = opts.containerId || 'BD_PLUGIN_T1'

  const aedes = await Aedes.createBroker()
  const server = net.createServer(aedes.handle)
  await new Promise((resolve, reject) => {
    server.listen(port, '127.0.0.1', () => resolve())
    server.on('error', reject)
  })

  const mockClient = mockServer.createServer({
    host: '127.0.0.1',
    port,
    type: opts.mockType || 'D40_M56',
    id: containerId
  })

  const config = {
    containerId,
    server: aedes,
    conf: { delay: 0 },
    type: opts.model || 'm56'
  }
  const device = await plugin.connect(config, { deviceId: 'BD-T1' })

  t.teardown(() => {
    if (mockClient && typeof mockClient.exit === 'function') mockClient.exit()
    server.close()
    aedes.close()
  })

  await promiseSleep(MOCK_WAIT_MS)

  return { device, ctx: Object.freeze({ deviceId: 'BD-T1', device, config, services: null }) }
}

function handler (section, name) {
  return loadPlugin(plugin).handlers[section].get(name)
}

test('plugin loads: every contract entry has a working handler module', (t) => {
  const loaded = loadPlugin(plugin)
  t.is(loaded.handlers.telemetry.size, 5)
  t.is(loaded.handlers.commands.size, 7)
  for (const entry of loaded.publishedContract.capabilities.telemetry) {
    t.is(entry.handler, undefined, `${entry.name} handler path stripped from published contract`)
  }
})

test('connect validates the device config', async (t) => {
  await t.exception(plugin.connect({ containerId: 'X' }, { deviceId: 'x' }), /ERR_DEVICE_CONFIG_INVALID/)
})

test('telemetry and command handlers work over the embedded broker', async (t) => {
  const { ctx, device } = await createDevice(t)

  const power = await handler('telemetry', 'container_power')(ctx, {})
  t.ok(typeof power === 'number' && power >= 0, `container_power ${power} W`)

  const temp = await handler('telemetry', 'temperature')(ctx, {})
  t.ok(typeof temp === 'number', `temperature ${temp} C`)

  const tank = await handler('telemetry', 'tank_status')(ctx, {})
  t.ok(typeof tank === 'string' && tank.includes('tank1'), `tank_status ${tank}`)

  const exhaust = await handler('telemetry', 'exhaust_status')(ctx, {})
  t.ok(['enabled', 'disabled'].includes(exhaust), `exhaust_status ${exhaust}`)

  const snap = await handler('telemetry', 'snap')(ctx, {})
  t.is(snap.success, true)
  t.ok(['running', 'stopped', 'error'].includes(snap.stats.status))
  t.ok(snap.stats.container_specific.cooling_system)
  t.ok(snap.config.container_specific.tactics)

  const tankSet = await handler('commands', 'setTankEnabled')(ctx, { tankIndex: 1, status: true })
  t.is(tankSet.success, true)

  const exhaustSet = await handler('commands', 'setAirExhaustEnabled')(ctx, { status: true })
  t.is(exhaustSet.success, true)

  const alarm = await handler('commands', 'resetAlarm')(ctx, {})
  t.is(alarm.success, true)

  const temps = await handler('commands', 'setTemperatureSettings')(ctx, { settings: { coldOil: 25, hotOil: 55 } })
  t.is(temps.success, true)

  const switched = await handler('commands', 'switchContainer')(ctx, { enabled: true })
  t.is(switched.success, true)

  // validateWriteAction is what the write-call approver invokes per device
  t.is(device.validateWriteAction('switchContainer', true), 1)
  t.exception(() => device.validateWriteAction('switchContainer', 'yes'), /ERR_SWITCH_CONTAINER_ENABLED_INVALID/)
})
