'use strict'

const test = require('brittle')
const Whatsminer = require('../../lib/whatsminer-api-v2-client')
const { STATUS, POWER_MODE } = require('../../../../../core/mdk').constants

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

// ─── modern v2 firmware (Msg-envelope reads) ──────────────────────────────────

test('getMinerStats - parses modern v2 firmware Msg envelope', async (t) => {
  const miner = makeWhatsminer()
  miner.rpc.request = async () => JSON.stringify({
    STATUS: 'S',
    When: 1784817659,
    Code: 131,
    Msg: {
      Elapsed: 238.35,
      'MHS av': 347052288,
      'MHS 1m': 346799104,
      'MHS 15m': 347052288,
      'HS RT': 346799104,
      freq_avg: 353.52,
      Power: 6199.66,
      'Power Rate': 17.88,
      'Env Temp': 37.625,
      'Power Mode': 'Low',
      'Factory GHS': 400332,
      'Power Limit': 6251,
      Uptime: 996
    },
    Description: ''
  })

  const stats = await miner.getMinerStats()
  t.is(stats.elapsed, 238.35)
  t.is(stats.mhs_av, 347052288)
  t.is(stats.power, 6199.66)
  t.is(stats.power_mode, 'Low')
  t.is(stats.uptime, 996)
})

test('getMinerStats - parses legacy v2 SUMMARY response unchanged', async (t) => {
  const miner = makeWhatsminer()
  miner.rpc.request = async () => JSON.stringify({
    STATUS: [{ STATUS: 'S', When: 1, Code: 11 }],
    SUMMARY: [{ Elapsed: 100, 'MHS av': 295000000, Power: 3400 }],
    id: 1
  })

  const stats = await miner.getMinerStats()
  t.is(stats.elapsed, 100)
  t.is(stats.mhs_av, 295000000)
  t.is(stats.power, 3400)
})

test('getMinerStats - uses chip temperature fallback when summary omits Temperature', async (t) => {
  const miner = makeWhatsminer()
  miner._requestReadEndpoint = async () => ({
    SUMMARY: [{
      Elapsed: 100,
      'MHS av': 295000000,
      'Chip Temp Avg': 82.5
    }]
  })

  const stats = await miner.getMinerStats()
  t.is(stats.temperature, 82.5)
})

test('getMinerStats - throws ERR_MINER_STATS_FAILED when summary missing', async (t) => {
  const miner = makeWhatsminer()
  miner.rpc.request = async () => JSON.stringify({ STATUS: 'E', Code: 14, Msg: 'invalid cmd' })
  await t.exception(miner.getMinerStats(), /ERR_MINER_STATS_FAILED/)
})

test('getPools - parses modern v2 firmware Msg envelope', async (t) => {
  const miner = makeWhatsminer()
  miner.rpc.request = async () => JSON.stringify({
    STATUS: 'S',
    Code: 131,
    Msg: [
      { POOL: 1, URL: 'stratum+tcp://pool:3333', Status: 'Alive', User: 'acct.wm001', Accepted: 10, Rejected: 0, Stale: 0 }
    ],
    Description: ''
  })

  const pools = await miner.getPools()
  t.is(pools.length, 1)
  t.is(pools[0].url, 'stratum+tcp://pool:3333')
  t.is(pools[0].user, 'acct.wm001')
  t.is(pools[0].accepted, 10)
})

test('getDevices - parses modern v2 firmware Msg envelope', async (t) => {
  const miner = makeWhatsminer()
  miner.rpc.request = async () => JSON.stringify({
    STATUS: 'S',
    Code: 131,
    Msg: [
      { ASC: 0, Slot: 0, Temperature: 60, 'Chip Temp Max': 63.85, 'MHS av': 115684096 },
      { ASC: 1, Slot: 1, Temperature: 61, 'Chip Temp Max': 62.1, 'MHS av': 115684096 }
    ],
    Description: ''
  })

  const devices = await miner.getDevices()
  t.is(devices.length, 2)
  t.is(devices[0].chip_temp_max, 63.85)
  t.is(devices[1].slot, 1)
})

// ─── API version resolution ───────────────────────────────────────────────────

test('init - resolves V2 handler from port 4028', async (t) => {
  const miner = makeWhatsminer({ port: 4028 })
  await miner.init()
  t.is(miner.apiVersion, '2.0.5')
  t.is(miner.protocolHandler.constructor.name, 'WMApiV2')
})

test('constructor - rejects API v3 because it has a separate plain client', (t) => {
  t.exception(() => makeWhatsminer({ port: 4433, apiVersion: '3.0.3' }), /ERR_USE_API_V3_CLIENT/)
})

test('constructor - port alone does not turn the legacy client into API v3', async (t) => {
  const miner = makeWhatsminer({ port: 4433 })
  await miner.init()
  t.is(miner.apiVersion, '2.0.5')
  t.is(miner.protocolHandler.constructor.name, 'WMApiV2')
})
