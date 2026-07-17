'use strict'

const test = require('brittle')
const libUtils = require('../../mock/utils')

const HASHRATE_KEYS = ['MHS av', 'MHS 5s', 'MHS 1m', 'MHS 5m', 'MHS 15m']

test('createErrorResponse - defaults and overrides', (t) => {
  const def = libUtils.createErrorResponse()
  t.is(def.STATUS, 'E')
  t.is(def.Code, 14)
  t.is(def.Msg, 'Invalid command')

  const custom = libUtils.createErrorResponse(132, 'API command ERROR', 'desc')
  t.is(custom.Code, 132)
  t.is(custom.Msg, 'API command ERROR')
  t.is(custom.Description, 'desc')
})

test('createSuccessResponse - defaults', (t) => {
  const res = libUtils.createSuccessResponse()
  t.is(res.STATUS, 'S')
  t.is(res.Code, 131)
})

test('createSuspendedSummary - zeroed vs randomized hashrates', (t) => {
  const zeroed = libUtils.createSuspendedSummary()
  for (const key of HASHRATE_KEYS) t.is(zeroed[key], 0)
  t.is(zeroed.Power, 13)

  const randomized = libUtils.createSuspendedSummary(true)
  for (const key of HASHRATE_KEYS) t.is(typeof randomized[key], 'number')
  t.is(randomized['HS RT'], 0)
})

test('createSuspendedDevs - zeroed vs randomized hashrates', (t) => {
  const zeroed = libUtils.createSuspendedDevs()
  for (const key of HASHRATE_KEYS) t.is(zeroed[key], 0)
  t.is(zeroed.Status, 'Initialising')

  const randomized = libUtils.createSuspendedDevs(true)
  for (const key of HASHRATE_KEYS) t.is(typeof randomized[key], 'number')
  t.is(randomized['Chip Frequency'], 0)
})

function makeTempState (currentTemp, suspended) {
  return {
    suspended,
    currentTemp,
    summary: { 'Chip Temp Min': currentTemp, 'Chip Temp Max': currentTemp, 'Chip Temp Avg': currentTemp },
    devs: [{ Temperature: currentTemp, 'Chip Temp Min': currentTemp, 'Chip Temp Max': currentTemp, 'Chip Temp Avg': currentTemp }]
  }
}

test('updateTemperature - active miner heats up, propagates to summary and devs', (t) => {
  const state = makeTempState(40, false)
  libUtils.updateTemperature(state)
  t.is(state.currentTemp, 40.1)
  t.is(state.summary['Chip Temp Max'], 40.1)
  t.is(state.summary['Chip Temp Min'], 40)
  t.is(state.devs[0].Temperature, 40.1)
})

test('updateTemperature - suspended miner cools down with rounding', (t) => {
  const state = makeTempState(40.005, true)
  libUtils.updateTemperature(state, true)
  t.is(state.currentTemp, 39.9)
})

test('updateTemperature - clamps to the 27..85 range', (t) => {
  const hot = makeTempState(85, false)
  libUtils.updateTemperature(hot)
  t.is(hot.currentTemp, 85)

  const cold = makeTempState(27, true)
  libUtils.updateTemperature(cold)
  t.is(cold.currentTemp, 27)
})

function makePowerState (powerMode) {
  return {
    summary: {
      'Power Mode': powerMode,
      'Target Freq': 720,
      freq_avg: 720,
      Power: 3000,
      'Power Limit': 3000,
      'MHS av': 0,
      'Target MHS': 0
    }
  }
}

test('calculatePowerModeHashrate - per-mode hashrate coefficients', (t) => {
  for (const [mode, min, max] of [['High', 3550, 3650], ['Low', 2550, 2650], ['Normal', 3050, 3150]]) {
    const state = makePowerState(mode)
    const newState = makePowerState(mode)
    const pastHashrates = []
    libUtils.calculatePowerModeHashrate(newState, state, pastHashrates, libUtils)
    const power = newState.summary.Power
    t.ok(newState.summary['MHS av'] >= power * min)
    t.ok(newState.summary['MHS av'] <= power * max)
    t.is(newState.summary['Target MHS'], 251931792)
    t.is(pastHashrates.length, 1)
  }
})

test('calculatePowerModeHashrate - keeps only the last 10 hashrates', (t) => {
  const pastHashrates = Array.from({ length: 10 }, (_, i) => i)
  libUtils.calculatePowerModeHashrate(makePowerState('Normal'), makePowerState('Normal'), pastHashrates, libUtils)
  t.is(pastHashrates.length, 10)
  t.is(pastHashrates[0], 1)
})

test('createPSU - enabled with power reading', (t) => {
  const psu = libUtils.createPSU(true, 'SER123', 42.5, 3000)
  t.is(psu.enable, '1')
  t.is(psu.iin, (39800 * 1512 / 3000).toFixed(2))
  t.is(psu.vin, '39800')
  t.is(psu.pin, '3000')
  t.is(psu.serial_no, 'SER123')
  t.is(psu.temp0, '42.5')
})

test('createPSU - disabled with fallbacks', (t) => {
  const psu = libUtils.createPSU(false)
  t.is(psu.enable, '0')
  t.is(psu.iin, '0')
  t.is(psu.vin, '39850')
  t.is(psu.pin, '8000')
  t.is(psu.serial_no, '1413C2246300196')
  t.is(psu.temp0, '36.0')
})

test('createBaseState - led_mode only present when configured', (t) => {
  const def = libUtils.createBaseState()
  t.absent('led_mode' in def)
  t.is(def.suspended, false)

  const withLed = libUtils.createBaseState({ led_mode: 'auto' })
  t.is(withLed.led_mode, 'auto')
})

test('createSummary - zeroed vs randomized hashrates', (t) => {
  const zeroed = libUtils.createSummary(libUtils)
  for (const key of HASHRATE_KEYS) t.is(zeroed[key], 0)

  const randomized = libUtils.createSummary(libUtils, true)
  for (const key of HASHRATE_KEYS) t.is(typeof randomized[key], 'number')
  t.is(randomized['Power Mode'], 'Normal')
})

test('createMinerInfo - upfreq_speed only present when configured', (t) => {
  const ctx = { host: '10.0.0.9', serial: 'SER123' }
  const def = libUtils.createMinerInfo(ctx)
  t.absent('upfreq_speed' in def)
  t.is(def.ip, '10.0.0.9')
  t.is(def.minersn, 'SER123')

  const withSpeed = libUtils.createMinerInfo(ctx, { upfreq_speed: 5 })
  t.is(withSpeed.upfreq_speed, 5)
})

test('validateArgs - any complete arglist passes', (t) => {
  const args = [['param'], ['color', 'period']]
  t.ok(libUtils.validateArgs(args, { param: 'auto' }))
  t.ok(libUtils.validateArgs(args, { color: 'red', period: 2 }))
  t.absent(libUtils.validateArgs(args, { color: 'red' }))
  t.absent(libUtils.validateArgs(args, {}))
})

test('proxyState - applies handler mutations back onto shared state', (t) => {
  const handler = libUtils.proxyState((ctx, state, req) => {
    state.count += req.inc
    return { ok: true }
  })
  const state = { count: 1 }
  const res = handler({}, state, { inc: 2 })
  t.alike(res, { ok: true })
  t.is(state.count, 3)
})

test('cleanup - restores initial state fields', (t) => {
  const state = { a: 1, b: 2 }
  const res = libUtils.cleanup(state, { a: 9 })
  t.is(res, state)
  t.is(state.a, 9)
  t.is(state.b, 2)
})

test('encryptResponse / decryptCommand - roundtrip', (t) => {
  const key = 'x5JSSQzqF0lEACIGSL0Ld1'
  const frame = JSON.parse(libUtils.encryptResponse({ cmd: 'power_on', token: 't' }, key))
  t.is(typeof frame.enc, 'string')
  const decoded = libUtils.decryptCommand({ data: frame.enc }, key)
  t.alike(decoded, { cmd: 'power_on', token: 't' })
})

test('getHashrate - avg is the mean of the window rates', (t) => {
  const rates = libUtils.getHashrate()
  const windows = ['MHS 5s', 'MHS 1m', 'MHS 5m', 'MHS 15m'].map(k => rates[k])
  const avg = windows.reduce((a, b) => a + b, 0) / 4
  t.is(rates['MHS av'], avg)
  for (const rate of windows) {
    t.ok(rate >= 290000000)
    t.ok(rate <= 300000000)
  }
})

test('randomNumber / getRandomIP - shape checks', (t) => {
  for (let i = 0; i < 20; i++) {
    const n = libUtils.randomNumber(5, 10)
    t.ok(n >= 5)
    t.ok(n <= 10)
  }
  t.ok(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(libUtils.getRandomIP()))
})

test('createPools / createDevdetails / createVersion - fixture shapes', (t) => {
  const pools = libUtils.createPools()
  t.is(pools.length, 3)
  t.is(pools[0].POOL, 1)

  t.is(libUtils.createDevdetails('M56S').length, 4)
  t.is(libUtils.createDevdetails('M56S', 2).length, 2)
  t.is(libUtils.createDevdetails('M56S', 2)[0].Model, 'M56S')

  const version = libUtils.createVersion('CHIP1')
  t.is(version.chip, 'CHIP1')
  t.is(version.platform, 'H616')
})

test('createDevs - zeroed vs randomized hashrates', (t) => {
  const ctx = { serial: 'SER123' }
  const zeroed = libUtils.createDevs(ctx, 'CD', [1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12])
  t.is(zeroed.length, 4)
  t.is(zeroed[0]['MHS av'], 0)
  t.is(zeroed[0]['PCB SN'], 'SER123')

  const randomized = libUtils.createDevs(ctx, 'CD', [1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], true)
  t.is(typeof randomized[0]['MHS av'], 'number')
})

function makeDevState () {
  return {
    summary: { freq_avg: 700, 'MHS av': 100, 'Total MH': 0, 'MHS 5s': 0, 'MHS 1m': 0, 'MHS 5m': 0, 'MHS 15m': 0, 'HS RT': 0 },
    devs: [{ Status: 'Dead' }]
  }
}

test('updateActiveDevs - fixed vs randomized hashrates', (t) => {
  const fixed = makeDevState()
  libUtils.updateActiveDevs(fixed, 123, libUtils)
  t.is(fixed.devs[0].Status, 'Alive')
  t.is(fixed.devs[0]['MHS av'], 123)
  t.is(fixed.devs[0]['HS RT'], 100)

  const randomized = makeDevState()
  libUtils.updateActiveDevs(randomized, 123, libUtils, true)
  t.is(randomized.devs[0]['HS RT'], 100)
  t.not(randomized.devs[0]['MHS av'], undefined)
})

test('updateActiveSummary - fixed vs randomized hashrates', (t) => {
  const fixed = makeDevState()
  libUtils.updateActiveSummary(fixed, 123, libUtils)
  t.is(fixed.summary['MHS 5s'], 123)
  t.is(fixed.summary['Total MH'], 400)

  const randomized = makeDevState()
  libUtils.updateActiveSummary(randomized, 123, libUtils, true)
  t.is(typeof randomized.summary['MHS av'], 'number')
})
