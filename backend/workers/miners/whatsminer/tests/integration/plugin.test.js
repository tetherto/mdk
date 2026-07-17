'use strict'

const test = require('brittle')
const plugin = require('../../plugin')
const wmMock = require('../../mock/server')
const { loadPlugin } = require('../../../../../core/mdk-worker/lib/plugin-loader')

const MOCK_PORT = 14061

async function createDevice (t, opts = {}) {
  const mock = wmMock.createServer({
    port: opts.port || MOCK_PORT,
    host: '127.0.0.1',
    type: 'm30sp',
    serial: 'WM-T1',
    password: 'admin'
  })
  await mock.ready

  const config = {
    address: '127.0.0.1',
    port: opts.port || MOCK_PORT,
    password: 'admin',
    type: 'miner-wm-m30sp'
  }
  const device = await plugin.connect(config, { deviceId: 'WM-T1' })

  t.teardown(async () => {
    await plugin.disconnect(device)
    mock.exit()
  })

  return { device, ctx: Object.freeze({ deviceId: 'WM-T1', device, config, services: null }) }
}

function handler (section, name) {
  return loadPlugin(plugin).handlers[section].get(name)
}

test('plugin loads: every contract entry has a working handler module', (t) => {
  const loaded = loadPlugin(plugin)
  t.is(loaded.handlers.telemetry.size, 14)
  t.is(loaded.handlers.commands.size, 6)
  for (const entry of loaded.publishedContract.capabilities.telemetry) {
    t.is(entry.handler, undefined, `${entry.name} handler path stripped from published contract`)
  }
})

test('connect validates the device config', async (t) => {
  await t.exception(plugin.connect({ address: '127.0.0.1' }, { deviceId: 'x' }), /ERR_DEVICE_CONFIG_INVALID/)
})

test('telemetry handlers translate the vendor API', async (t) => {
  const { ctx } = await createDevice(t)

  const hashrateAvg = await handler('telemetry', 'hashrate_avg')(ctx, {})
  t.ok(typeof hashrateAvg === 'number' && hashrateAvg > 0, `hashrate_avg ${hashrateAvg} TH/s`)

  const power = await handler('telemetry', 'power')(ctx, {})
  t.ok(typeof power === 'number', `power ${power} W`)

  const status = await handler('telemetry', 'status')(ctx, {})
  t.ok(['mining', 'sleeping'].includes(status), `status ${status}`)

  const powerMode = await handler('telemetry', 'power_mode')(ctx, {})
  t.is(powerMode, 'normal')

  const poolUrl = await handler('telemetry', 'pool_url')(ctx, {})
  t.ok(typeof poolUrl === 'string')

  const efficiency = await handler('telemetry', 'efficiency')(ctx, {})
  t.ok(efficiency > 0, `efficiency ${efficiency} W/TH`)

  const fanIn = await handler('telemetry', 'fan_speed_in')(ctx, {})
  t.ok(typeof fanIn === 'number')
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

  const mode = await handler('commands', 'setPowerMode')(ctx, { mode: 'low' })
  t.alike(mode, { success: true })

  await t.exception(handler('commands', 'setPowerMode')(ctx, { mode: 'bogus' }), /ERR_INVALID_MODE/)

  const pct = await handler('commands', 'setPowerPct')(ctx, { pct: 50 })
  t.alike(pct, { success: true })

  const over = await handler('commands', 'setPowerPct')(ctx, { pct: 150 })
  t.is(over.success, false, 'pct > 100 rejected for air-cooled model')

  const rebooted = await handler('commands', 'reboot')(ctx, {})
  t.alike(rebooted, { success: true })

  // validateWriteAction is what the write-call approver invokes per device
  t.is(device.validateWriteAction('setPowerMode', 'low'), 1)
  t.exception(() => device.validateWriteAction('setPowerMode', 'bogus'), /ERR_SET_POWER_MODE_INVALID/)
})

test('setupPools pushes pool config and reports success', async (t) => {
  const { ctx } = await createDevice(t, { port: MOCK_PORT + 3 })

  const res = await handler('commands', 'setupPools')(ctx, {
    pools: [
      { url: 'stratum+tcp://pool.example:3333', worker_name: 'wrk', worker_password: 'x' }
    ]
  })
  t.is(res.success, true)
})
