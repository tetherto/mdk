'use strict'

const { test } = require('brittle')
const containerPower = require('../../plugin/src/telemetry/container-power')
const temperature = require('../../plugin/src/telemetry/temperature')
const tankStatus = require('../../plugin/src/telemetry/tank-status')
const exhaustStatus = require('../../plugin/src/telemetry/exhaust-status')
const switchSocket = require('../../plugin/src/commands/switch-socket')
const switchCoolingSystem = require('../../plugin/src/commands/switch-cooling-system')
const plugin = require('../../plugin')

function ctxWithDevice (device) {
  return { device }
}

test('container-power telemetry converts kW to W and defaults to 0', async (t) => {
  const ctx = ctxWithDevice({ getContainerPowerInformation: async () => ({ totalPower: 63.4 }) })
  t.is(await containerPower(ctx), 63400, 'kW to W')
  const missing = ctxWithDevice({ getContainerPowerInformation: async () => undefined })
  t.is(await containerPower(missing), 0, 'missing power defaults to 0')
  const nan = ctxWithDevice({ getContainerPowerInformation: async () => ({ totalPower: NaN }) })
  t.is(await containerPower(nan), 0, 'NaN power defaults to 0')
})

test('temperature telemetry returns container temp or 0', async (t) => {
  const ctx = ctxWithDevice({ getTemperatureInformation: async () => ({ containerTemperature: 28.8 }) })
  t.is(await temperature(ctx), 28.8, 'temp passthrough')
  const missing = ctxWithDevice({ getTemperatureInformation: async () => undefined })
  t.is(await temperature(missing), 0, 'missing temp defaults to 0')
})

test('tank-status telemetry formats both tanks', async (t) => {
  const ctx = ctxWithDevice({ getTankStatus: async () => ({ tank1Enabled: true, tank2Enabled: false }) })
  t.is(await tankStatus(ctx), 'tank1:enabled,tank2:disabled', 'mixed tanks')
  const both = ctxWithDevice({ getTankStatus: async () => ({ tank1Enabled: false, tank2Enabled: true }) })
  t.is(await tankStatus(both), 'tank1:disabled,tank2:enabled', 'inverse tanks')
  const missing = ctxWithDevice({ getTankStatus: async () => null })
  t.is(await tankStatus(missing), 'unknown', 'unknown without status')
})

test('exhaust-status telemetry reports enabled state', async (t) => {
  const on = ctxWithDevice({ getExhaustFanStatus: async () => ({ airExhaustEnabled: true }) })
  t.is(await exhaustStatus(on), 'enabled', 'enabled')
  const off = ctxWithDevice({ getExhaustFanStatus: async () => ({ airExhaustEnabled: false }) })
  t.is(await exhaustStatus(off), 'disabled', 'disabled')
  const missing = ctxWithDevice({ getExhaustFanStatus: async () => null })
  t.is(await exhaustStatus(missing), 'unknown', 'unknown without status')
})

test('switch-socket command forwards args to device', async (t) => {
  let received = null
  const ctx = ctxWithDevice({ switchSocket: async (args) => { received = args; return { success: true } } })
  const result = await switchSocket(ctx, { args: [['1-1', '1', true]] })
  t.alike(result, { success: true }, 'returns device result')
  t.alike(received, [['1-1', '1', true]], 'args forwarded')
})

test('switch-cooling-system command forwards enabled flag', async (t) => {
  let received = null
  const ctx = ctxWithDevice({ switchCoolingSystem: async (enabled) => { received = enabled; return { success: true } } })
  const result = await switchCoolingSystem(ctx, { enabled: false })
  t.alike(result, { success: true }, 'returns device result')
  t.is(received, false, 'enabled forwarded')
})

test('plugin connect honours provided conf', async (t) => {
  const server = { subscribe: () => {}, publish: () => {} }
  const container = await plugin.connect({ containerId: 'C1', server, type: 'm56', conf: { delay: 5 } }, { deviceId: 'dev1' })
  t.is(container.conf.delay, 5, 'conf passed through')
  container.emit('error', new Error('boom'))
  t.pass('error listener attached')
})
