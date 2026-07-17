'use strict'

const test = require('brittle')
const plugin = require('../../plugin')
const avMock = require('../../mock/server')
const { loadPlugin } = require('../../../../../core/mdk-worker/lib/plugin-loader')

const MOCK_PORT = 14071

async function createDevice (t, opts = {}) {
  const port = opts.port || MOCK_PORT
  const mock = avMock.createServer({
    host: '127.0.0.1',
    port,
    type: 'a1346',
    serial: 'AV-T1',
    delay: 0
  })

  const config = {
    address: '127.0.0.1',
    port,
    password: 'root',
    username: 'root',
    type: 'miner-av-a1346'
  }
  const device = await plugin.connect(config, { deviceId: 'AV-T1' })

  t.teardown(async () => {
    await plugin.disconnect(device)
    mock.exit()
  })

  return { device, ctx: Object.freeze({ deviceId: 'AV-T1', device, config, services: null }) }
}

function handler (section, name) {
  return loadPlugin(plugin).handlers[section].get(name)
}

test('plugin loads: every contract entry has a working handler module', (t) => {
  const loaded = loadPlugin(plugin)
  t.is(loaded.handlers.telemetry.size, 9)
  t.is(loaded.handlers.commands.size, 4)
  for (const entry of loaded.publishedContract.capabilities.telemetry) {
    t.is(entry.handler, undefined, `${entry.name} handler path stripped from published contract`)
  }
})

test('connect validates the device config', async (t) => {
  await t.exception(plugin.connect({ port: 4028 }, { deviceId: 'x' }), /ERR_DEVICE_CONFIG_INVALID/)
})

test('telemetry handlers translate the CGMiner ASCII API', async (t) => {
  const { ctx } = await createDevice(t)

  const hashrateAvg = await handler('telemetry', 'hashrate_avg')(ctx, {})
  t.ok(typeof hashrateAvg === 'number' && hashrateAvg > 0, `hashrate_avg ${hashrateAvg} TH/s`)

  const power = await handler('telemetry', 'power')(ctx, {})
  t.ok(typeof power === 'number' && power > 0, `power ${power} W`)

  const temperature = await handler('telemetry', 'temperature')(ctx, {})
  t.ok(typeof temperature === 'number', `temperature ${temperature} C`)

  const fanSpeed = await handler('telemetry', 'fan_speed')(ctx, {})
  t.ok(typeof fanSpeed === 'number', `fan_speed ${fanSpeed} RPM`)

  const status = await handler('telemetry', 'status')(ctx, {})
  t.ok(['mining', 'sleeping'].includes(status), `status ${status}`)

  const powerMode = await handler('telemetry', 'power_mode')(ctx, {})
  t.ok(['sleep', 'normal', 'high'].includes(powerMode), `power_mode ${powerMode}`)

  const uptime = await handler('telemetry', 'uptime')(ctx, {})
  t.ok(typeof uptime === 'number', `uptime ${uptime} s`)

  const efficiency = await handler('telemetry', 'efficiency')(ctx, {})
  t.ok(typeof efficiency === 'number' && efficiency > 0, `efficiency ${efficiency} W/TH`)
})

test('snap handler returns the full legacy snapshot shape', async (t) => {
  const { ctx } = await createDevice(t, { port: MOCK_PORT + 1 })

  const snap = await handler('telemetry', 'snap')(ctx, {})
  t.is(snap.success, true)
  t.ok(snap.stats.status)
  t.ok(snap.stats.hashrate_mhs)
  t.ok(snap.stats.temperature_c)
  t.ok(Array.isArray(snap.stats.pool_status))
  t.ok(snap.config.pool_config)
  t.ok(snap.config.power_mode)
})

test('command handlers drive vendor write endpoints', async (t) => {
  const { ctx, device } = await createDevice(t, { port: MOCK_PORT + 2 })

  const led = await handler('commands', 'setLED')(ctx, { enabled: false })
  t.alike(led, { success: true })

  const mode = await handler('commands', 'setPowerMode')(ctx, { mode: 'normal' })
  t.alike(mode, { success: true })

  await t.exception(handler('commands', 'setPowerMode')(ctx, { mode: 'bogus' }), /ERR_INVALID_MODE/)

  const rebooted = await handler('commands', 'reboot')(ctx, {})
  t.alike(rebooted, { success: true })

  // validateWriteAction is what the write-call approver invokes per device
  t.is(device.validateWriteAction('setPowerMode', 'normal'), 1)
  t.exception(() => device.validateWriteAction('setPowerMode', 'bogus'), /ERR_SET_POWER_MODE_INVALID/)
})
