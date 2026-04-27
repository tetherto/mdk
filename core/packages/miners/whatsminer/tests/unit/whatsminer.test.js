'use strict'

const test = require('brittle')
const Whatsminer = require('../../lib/whatsminer')
const { STATUS, POWER_MODE } = require('../../../../tpls/tpl-lib-miner/lib/utils/constants')

function makeWhatsminer (opts = {}) {
  const mockRpc = { request: async () => '{}', stop: async () => {} }
  const socketer = {
    readStrategy: 'on_end',
    rpc: () => mockRpc
  }
  return new Whatsminer({
    socketer,
    address: '127.0.0.1',
    port: 4028,
    password: 'admin',
    type: 'miner-wm-m56s',
    id: 'test-miner-1',
    conf: {},
    ...opts
  })
}

// ─── _getStatus ───────────────────────────────────────────────────────────────

test('_getStatus - returns ERROR when isErrored is true', (t) => {
  const miner = makeWhatsminer()
  const result = miner._getStatus(true, { mhs_av: '100000' })
  t.is(result, STATUS.ERROR)
})

test('_getStatus - returns MINING when hashrate > 0 and no errors', (t) => {
  const miner = makeWhatsminer()
  const result = miner._getStatus(false, { mhs_av: '295000000' })
  t.is(result, STATUS.MINING)
})

test('_getStatus - returns SLEEPING when hashrate is 0 and no errors', (t) => {
  const miner = makeWhatsminer()
  const result = miner._getStatus(false, { mhs_av: '0' })
  t.is(result, STATUS.SLEEPING)
})

test('_getStatus - returns SLEEPING when mhs_av is missing', (t) => {
  const miner = makeWhatsminer()
  const result = miner._getStatus(false, { mhs_av: undefined })
  t.is(result, STATUS.SLEEPING)
})

// ─── _isSuspended ─────────────────────────────────────────────────────────────

test('_isSuspended - returns true when mhs_av is 0', (t) => {
  const miner = makeWhatsminer()
  t.ok(miner._isSuspended({ mhs_av: '0' }))
})

test('_isSuspended - returns false when mhs_av > 0', (t) => {
  const miner = makeWhatsminer()
  t.absent(miner._isSuspended({ mhs_av: '295000000' }))
})

// ─── _calcPowerW ──────────────────────────────────────────────────────────────

test('_calcPowerW - floors to 2 decimal places', (t) => {
  const miner = makeWhatsminer()
  t.is(miner._calcPowerW({ power: '3456.789' }), 3456.78)
})

test('_calcPowerW - handles integer power', (t) => {
  const miner = makeWhatsminer()
  t.is(miner._calcPowerW({ power: '3000' }), 3000)
})

// ─── _calcEfficiency ──────────────────────────────────────────────────────────

test('_calcEfficiency - floors power_rate to 2 decimal places', (t) => {
  const miner = makeWhatsminer()
  t.is(miner._calcEfficiency({ power_rate: '30.059' }), 30.05)
})

test('_calcEfficiency - handles integer power_rate', (t) => {
  const miner = makeWhatsminer()
  t.is(miner._calcEfficiency({ power_rate: '26' }), 26)
})

// ─── _calcAvgTemp ─────────────────────────────────────────────────────────────

test('_calcAvgTemp - calculates average across devices', (t) => {
  const miner = makeWhatsminer()
  const devices = [
    { chip_temp_avg: '60.0' },
    { chip_temp_avg: '62.0' },
    { chip_temp_avg: '64.0' },
    { chip_temp_avg: '66.0' }
  ]
  t.is(miner._calcAvgTemp(devices), 63)
})

test('_calcAvgTemp - floors to 2 decimal places', (t) => {
  const miner = makeWhatsminer()
  const devices = [
    { chip_temp_avg: '60.1' },
    { chip_temp_avg: '60.2' }
  ]
  t.is(miner._calcAvgTemp(devices), 60.15)
})

// ─── _getPowerMode ────────────────────────────────────────────────────────────

test('_getPowerMode - returns sleep when mhs_av is 0', (t) => {
  const miner = makeWhatsminer()
  t.is(miner._getPowerMode({ mhs_av: '0', power_mode: 'Normal' }), POWER_MODE.SLEEP)
})

test('_getPowerMode - returns lowercased power_mode when mining', (t) => {
  const miner = makeWhatsminer()
  t.is(miner._getPowerMode({ mhs_av: '295000000', power_mode: 'Normal' }), 'normal')
  t.is(miner._getPowerMode({ mhs_av: '295000000', power_mode: 'High' }), 'high')
  t.is(miner._getPowerMode({ mhs_av: '295000000', power_mode: 'Low' }), 'low')
})

// ─── _calcHashrates ───────────────────────────────────────────────────────────

test('_calcHashrates - returns all hashrate fields floored to 2 decimal places', (t) => {
  const miner = makeWhatsminer()
  const stats = {
    mhs_av: '295123456.789',
    mhs_5s: '294000000.1',
    mhs_1m: '295000000.55',
    mhs_5m: '296000000.999',
    mhs_15m: '293000000.0'
  }
  const result = miner._calcHashrates(stats)
  t.is(result.avg, 295123456.78)
  t.is(result.t_5s, 294000000.1)
  t.is(result.t_1m, 295000000.55)
  t.is(result.t_5m, 296000000.99)
  t.is(result.t_15m, 293000000)
})

// ─── checkIfAllErrorsAreMinor ─────────────────────────────────────────────────

test('checkIfAllErrorsAreMinor - returns true for all minor M56S errors', (t) => {
  const miner = makeWhatsminer({ type: 'miner-wm-m56s' })
  t.ok(miner.checkIfAllErrorsAreMinor([203, 204, 205]))
})

test('checkIfAllErrorsAreMinor - returns false when any error is major for M56S', (t) => {
  const miner = makeWhatsminer({ type: 'miner-wm-m56s' })
  t.absent(miner.checkIfAllErrorsAreMinor([203, 110]))
})

test('checkIfAllErrorsAreMinor - returns true for all minor M30S+ errors', (t) => {
  const miner = makeWhatsminer({ type: 'miner-wm-m30sp' })
  t.ok(miner.checkIfAllErrorsAreMinor([203, 320, 901]))
})

test('checkIfAllErrorsAreMinor - returns true for all minor M53S errors', (t) => {
  const miner = makeWhatsminer({ type: 'miner-wm-m53s' })
  t.ok(miner.checkIfAllErrorsAreMinor([202, 205, 217]))
})

test('checkIfAllErrorsAreMinor - returns false when any error is major for M53S', (t) => {
  const miner = makeWhatsminer({ type: 'miner-wm-m53s' })
  t.absent(miner.checkIfAllErrorsAreMinor([202, 110]))
})

test('checkIfAllErrorsAreMinor - returns false for M63 (no minor set defined)', (t) => {
  const miner = makeWhatsminer({ type: 'miner-wm-m63' })
  t.absent(miner.checkIfAllErrorsAreMinor([203, 204]))
})

test('checkIfAllErrorsAreMinor - returns true for empty errors array on M56S', (t) => {
  const miner = makeWhatsminer({ type: 'miner-wm-m56s' })
  t.ok(miner.checkIfAllErrorsAreMinor([]))
})

// ─── validateWriteAction ──────────────────────────────────────────────────────

test('validateWriteAction - accepts valid setPowerMode modes', (t) => {
  const miner = makeWhatsminer()
  t.is(miner.validateWriteAction('setPowerMode', 'low'), 1)
  t.is(miner.validateWriteAction('setPowerMode', 'normal'), 1)
  t.is(miner.validateWriteAction('setPowerMode', 'high'), 1)
  t.is(miner.validateWriteAction('setPowerMode', 'sleep'), 1)
})

test('validateWriteAction - throws for invalid setPowerMode mode', (t) => {
  const miner = makeWhatsminer()
  t.exception(() => miner.validateWriteAction('setPowerMode', 'turbo'), /ERR_SET_POWER_MODE_INVALID/)
})

test('validateWriteAction - delegates other actions to super', (t) => {
  const miner = makeWhatsminer()
  t.is(miner.validateWriteAction('setHostname', 'my-miner'), 1)
})

test('validateWriteAction - setLED validates boolean arg via super', (t) => {
  const miner = makeWhatsminer()
  t.exception(() => miner.validateWriteAction('setLED', 'yes'), /ERR_SET_LED_ENABLED_INVALID/)
})

// ─── setLED argument validation ───────────────────────────────────────────────

test('setLED - throws ERR_INVALID_ARG_TYPE for non-boolean', async (t) => {
  const miner = makeWhatsminer()
  await t.exception(miner.setLED('yes'), /ERR_INVALID_ARG_TYPE/)
})

test('setLED - throws ERR_INVALID_ARG_TYPE for number', async (t) => {
  const miner = makeWhatsminer()
  await t.exception(miner.setLED(1), /ERR_INVALID_ARG_TYPE/)
})
