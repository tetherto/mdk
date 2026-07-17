'use strict'

const test = require('brittle')
const plugin = require('../../plugin')
const asMock = require('../../mock/server')
const { loadPlugin } = require('../../../../../core/mdk-worker/lib/plugin-loader')

const MOCK_PORT = 14110

async function createDevice (t, opts = {}) {
  const port = opts.port || MOCK_PORT
  const mock = asMock.createServer({
    host: '127.0.0.1',
    port,
    type: opts.type || 'hk3'
  })
  await mock.ready

  const config = {
    address: '127.0.0.1',
    port,
    model: opts.type || 'hk3',
    type: `container-as-${opts.type || 'hk3'}`
  }
  const device = await plugin.connect(config, { deviceId: 'AS-T1' })

  t.teardown(() => {
    mock.exit()
  })

  return { device, ctx: Object.freeze({ deviceId: 'AS-T1', device, config, services: null }) }
}

function handler (section, name) {
  return loadPlugin(plugin).handlers[section].get(name)
}

test('plugin loads: every contract entry has a working handler module', (t) => {
  const loaded = loadPlugin(plugin)
  t.is(loaded.handlers.telemetry.size, 5)
  t.is(loaded.handlers.commands.size, 5)
  for (const entry of loaded.publishedContract.capabilities.telemetry) {
    t.is(entry.handler, undefined, `${entry.name} handler path stripped from published contract`)
  }
})

test('connect validates the device config', async (t) => {
  await t.exception(plugin.connect({ address: '127.0.0.1' }, { deviceId: 'x' }), /ERR_DEVICE_CONFIG_INVALID/)
  await t.exception(plugin.connect({ address: '127.0.0.1', port: 8000, model: 'bogus' }, { deviceId: 'x' }), /ERR_MODEL_INVALID/)
})

test('telemetry handlers read cooling data (hk3)', async (t) => {
  const { ctx } = await createDevice(t)

  const inlet = await handler('telemetry', 'inlet_temp')(ctx, {})
  t.ok(typeof inlet === 'number', `inlet_temp ${inlet} C`)

  const outlet = await handler('telemetry', 'outlet_temp')(ctx, {})
  t.ok(typeof outlet === 'number', `outlet_temp ${outlet} C`)

  const supply = await handler('telemetry', 'liquid_supply_temp')(ctx, {})
  t.ok(typeof supply === 'number', `liquid_supply_temp ${supply} C`)

  const cooling = await handler('telemetry', 'cooling_status')(ctx, {})
  t.ok(['running', 'stopped'].includes(cooling), `cooling_status ${cooling}`)
})

test('snap handler returns the full legacy snapshot shape (immersion)', async (t) => {
  const { ctx } = await createDevice(t, { port: MOCK_PORT + 1, type: 'immersion' })

  const snap = await handler('telemetry', 'snap')(ctx, {})
  t.is(snap.success, true)
  t.ok(['running', 'stopped', 'error'].includes(snap.stats.status))
  t.ok(snap.stats.container_specific)
  t.ok(snap.config.container_specific)
})

test('command handlers drive the cooler endpoint', async (t) => {
  const { ctx, device } = await createDevice(t, { port: MOCK_PORT + 2 })

  const reset = await handler('commands', 'resetCoolingSystem')(ctx, {})
  t.is(reset.success, true)

  const setTemp = await handler('commands', 'setLiquidSupplyTemperature')(ctx, { temperature: 36 })
  t.is(setTemp.success, true)

  const cooling = await handler('commands', 'switchCoolingSystem')(ctx, { enabled: true })
  t.is(cooling.success, true)

  // switchContainer/switchSocket are contract-declared but not implemented by
  // the antspace device — commands fail like the legacy path did
  await t.exception(handler('commands', 'switchContainer')(ctx, { enabled: true }), /ERR_NO_IMPL/)

  // validateWriteAction is what the write-call approver invokes per device
  t.is(device.validateWriteAction('switchCoolingSystem', true), 1)
  t.exception(() => device.validateWriteAction('switchCoolingSystem', 'yes'), /ERR_SWITCH_COOLING_SYSTEM_ENABLED_INVALID/)
})
