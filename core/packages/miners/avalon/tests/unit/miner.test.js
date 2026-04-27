'use strict'

const test = require('brittle')
const { STATUS, POWER_MODE } = require('../../../../tpls/tpl-lib-miner/lib/utils/constants.js')

function makeStubMiner (opts = {}) {
  const AvalonMiner = require('../../lib/avalon.miner.js')
  const stubSocketer = {
    readStrategy: 'on_end',
    rpc: () => ({
      request: async () => '',
      stop: async () => {}
    })
  }
  return new AvalonMiner({
    socketer: stubSocketer,
    address: '127.0.0.1',
    port: 4028,
    password: 'root',
    timeout: 5000,
    conf: {},
    id: 'test-miner',
    ...opts
  })
}

test('_calcHashrates - parses all hashrate fields correctly', (t) => {
  const miner = makeStubMiner()
  const stats = {
    mhs_av: '295000000.50',
    mhs_30s: '294000000.12',
    mhs_1m: '293000000.99',
    mhs_5m: '292000000.00',
    mhs_15m: '291000000.75'
  }

  const result = miner._calcHashrates(stats)

  t.is(result.avg, 295000000.50)
  t.is(result.t_30s, 294000000.12)
  t.is(result.t_1m, 293000000.99)
  t.is(result.t_5m, 292000000.00)
  t.is(result.t_15m, 291000000.75)
})

test('_calcHashrates - returns 0 for NaN values', (t) => {
  const miner = makeStubMiner()
  const stats = {
    mhs_av: 'invalid',
    mhs_30s: undefined,
    mhs_1m: null,
    mhs_5m: '',
    mhs_15m: 'NaN'
  }

  const result = miner._calcHashrates(stats)

  t.is(result.avg, 0)
  t.is(result.t_30s, 0)
  t.is(result.t_1m, 0)
  t.is(result.t_5m, 0)
  t.is(result.t_15m, 0)
})

test('_calcHashrates - returns 0 for negative values', (t) => {
  const miner = makeStubMiner()
  const stats = {
    mhs_av: '-100',
    mhs_30s: '-1',
    mhs_1m: '0',
    mhs_5m: '0',
    mhs_15m: '0'
  }

  const result = miner._calcHashrates(stats)

  t.is(result.avg, 0)
  t.is(result.t_30s, 0)
  t.is(result.t_1m, 0)
})

test('_calcHashrates - floors to 2 decimal places', (t) => {
  const miner = makeStubMiner()
  const stats = {
    mhs_av: '295000000.999',
    mhs_30s: '0',
    mhs_1m: '0',
    mhs_5m: '0',
    mhs_15m: '0'
  }

  const result = miner._calcHashrates(stats)
  t.is(result.avg, 295000000.99)
})

test('_calcEfficiency - calculates W/TH/s correctly', (t) => {
  const miner = makeStubMiner()
  const estats = { object_power_consumption: '3100' }
  const stats = { mhs_av: '295000000' }

  const result = miner._calcEfficiency(estats, stats)
  t.ok(result > 10 && result < 11, `expected ~10.51, got ${result}`)
})

test('_calcEfficiency - returns 0 when hashrate is 0', (t) => {
  const miner = makeStubMiner()
  const estats = { object_power_consumption: '3100' }
  const stats = { mhs_av: '0' }

  t.is(miner._calcEfficiency(estats, stats), 0)
})

test('_calcEfficiency - returns 0 when power is NaN', (t) => {
  const miner = makeStubMiner()
  const estats = { object_power_consumption: 'invalid' }
  const stats = { mhs_av: '295000000' }

  t.is(miner._calcEfficiency(estats, stats), 0)
})

test('_calcPowerW - parses float power consumption', (t) => {
  const miner = makeStubMiner()
  t.is(miner._calcPowerW({ object_power_consumption: '3100' }), 3100)
  t.is(miner._calcPowerW({ object_power_consumption: '3100.5' }), 3100.5)
  t.is(miner._calcPowerW({ object_power_consumption: '0' }), 0)
})

test('_calcAvgTemp - floors to 2 decimal places', (t) => {
  const miner = makeStubMiner()
  t.is(miner._calcAvgTemp({ temperature_avg: '36.999' }), 36.99)
  t.is(miner._calcAvgTemp({ temperature_avg: '36.0' }), 36)
  t.is(miner._calcAvgTemp({ temperature_avg: '85' }), 85)
})

test('_isSuspended - returns true when soft_off is not "0"', (t) => {
  const miner = makeStubMiner()
  t.ok(miner._isSuspended({ soft_off: '1' }))
  t.ok(miner._isSuspended({ soft_off: '2' }))
})

test('_isSuspended - returns false when soft_off is "0"', (t) => {
  const miner = makeStubMiner()
  t.absent(miner._isSuspended({ soft_off: '0' }))
})

test('_getPowerMode - returns SLEEP when soft_off is not "0"', (t) => {
  const miner = makeStubMiner()
  t.is(miner._getPowerMode({ soft_off: '1', work_mode: '0' }), POWER_MODE.SLEEP)
})

test('_getPowerMode - returns HIGH when work_mode is "1"', (t) => {
  const miner = makeStubMiner()
  t.is(miner._getPowerMode({ soft_off: '0', work_mode: '1' }), POWER_MODE.HIGH)
})

test('_getPowerMode - returns NORMAL when soft_off is "0" and work_mode is "0"', (t) => {
  const miner = makeStubMiner()
  t.is(miner._getPowerMode({ soft_off: '0', work_mode: '0' }), POWER_MODE.NORMAL)
})

test('_getStatus - returns ERROR when isErrored is true', (t) => {
  const miner = makeStubMiner()
  t.is(miner._getStatus(true, { soft_off: '0' }), STATUS.ERROR)
})

test('_getStatus - returns MINING when not errored and soft_off is "0"', (t) => {
  const miner = makeStubMiner()
  t.is(miner._getStatus(false, { soft_off: '0' }), STATUS.MINING)
})

test('_getStatus - returns SLEEPING when not errored and soft_off is not "0"', (t) => {
  const miner = makeStubMiner()
  t.is(miner._getStatus(false, { soft_off: '1' }), STATUS.SLEEPING)
})

test('validateWriteAction - accepts valid power modes', (t) => {
  const miner = makeStubMiner()
  t.is(miner.validateWriteAction('setPowerMode', POWER_MODE.SLEEP), 1)
  t.is(miner.validateWriteAction('setPowerMode', POWER_MODE.NORMAL), 1)
  t.is(miner.validateWriteAction('setPowerMode', POWER_MODE.HIGH), 1)
})

test('validateWriteAction - throws for invalid power mode', (t) => {
  const miner = makeStubMiner()
  t.exception(() => miner.validateWriteAction('setPowerMode', 'turbo'), /ERR_SET_POWER_MODE_INVALID/)
  t.exception(() => miner.validateWriteAction('setPowerMode', ''), /ERR_SET_POWER_MODE_INVALID/)
  t.exception(() => miner.validateWriteAction('setPowerMode', null), /ERR_SET_POWER_MODE_INVALID/)
})

function makeEstatsBase (overrides = {}) {
  return {
    power_status: ['0', '1', '1'],
    error_code: '0',
    mm_board_status_mark: '0',
    psu_status: '0',
    hash_board_status: ['0', '0', '0'],
    pool_status: '0',
    ...overrides
  }
}

function makePoolsBase (status = 'Alive') {
  return [
    { status, url: 'stratum+tcp://pool.com:1314', user: 'worker' }
  ]
}

test('_prepErrors - no errors for healthy miner state', (t) => {
  const miner = makeStubMiner()
  const data = {
    estats: makeEstatsBase(),
    pools: makePoolsBase('Alive')
  }

  const result = miner._prepErrors(data)
  t.absent(result.isErrored)
  t.is(result.errors.length, 0)
})

test('_prepErrors - detects all_pools_dead', (t) => {
  const miner = makeStubMiner()
  const data = {
    estats: makeEstatsBase(),
    pools: [
      { status: 'Dead', url: 'stratum+tcp://pool.com:1314', user: 'worker' },
      { status: 'Dead', url: 'stratum+tcp://pool2.com:1314', user: 'worker' }
    ]
  }

  const result = miner._prepErrors(data)
  t.ok(result.isErrored)
  t.ok(result.errors.some(e => e.name === 'all_pools_dead'))
})

test('_prepErrors - detects power_error_status when all power_status entries are "0"', (t) => {
  const miner = makeStubMiner()
  const data = {
    estats: makeEstatsBase({ power_status: ['0', '0', '0', '0', '0', '0', '0'] }),
    pools: makePoolsBase()
  }

  const result = miner._prepErrors(data)
  t.ok(result.isErrored)
  t.ok(result.errors.some(e => e.name === 'power_error_status'))
})

test('_prepErrors - detects power_error_status when first power_status is not "0"', (t) => {
  const miner = makeStubMiner()
  const data = {
    estats: makeEstatsBase({ power_status: ['1', '0', '0'] }),
    pools: makePoolsBase()
  }

  const result = miner._prepErrors(data)
  t.ok(result.isErrored)
  t.ok(result.errors.some(e => e.name === 'power_error_status'))
})

test('_prepErrors - detects hashboard_error for error_code 513', (t) => {
  const miner = makeStubMiner()
  const data = {
    estats: makeEstatsBase({ error_code: '513' }),
    pools: makePoolsBase()
  }

  const result = miner._prepErrors(data)
  t.ok(result.isErrored)
  t.ok(result.errors.some(e => e.name === 'hashboard_error'))
})

test('_prepErrors - detects hashboard_temp_overheating for error_code 128', (t) => {
  const miner = makeStubMiner()
  const data = {
    estats: makeEstatsBase({ error_code: '128' }),
    pools: makePoolsBase()
  }

  const result = miner._prepErrors(data)
  t.ok(result.isErrored)
  t.ok(result.errors.some(e => e.name === 'hashboard_temp_overheating'))
})

test('_prepErrors - detects control_board_exception when mm_board_status_mark is "1"', (t) => {
  const miner = makeStubMiner()
  const data = {
    estats: makeEstatsBase({ mm_board_status_mark: '1' }),
    pools: makePoolsBase()
  }

  const result = miner._prepErrors(data)
  t.ok(result.isErrored)
  t.ok(result.errors.some(e => e.name === 'control_board_exception'))
})

test('_prepErrors - detects power_error_status when psu_status is not "0"', (t) => {
  const miner = makeStubMiner()
  const data = {
    estats: makeEstatsBase({ psu_status: '1' }),
    pools: makePoolsBase()
  }

  const result = miner._prepErrors(data)
  t.ok(result.isErrored)
  t.ok(result.errors.some(e => e.name === 'power_error_status'))
})

test('_prepErrors - detects hashboard_error for each errored hash_board_status entry', (t) => {
  const miner = makeStubMiner()
  const data = {
    estats: makeEstatsBase({ hash_board_status: ['1', '0', '1'] }),
    pools: makePoolsBase()
  }

  const result = miner._prepErrors(data)
  t.ok(result.isErrored)
  const hbErrors = result.errors.filter(e => e.name === 'hashboard_error')
  t.is(hbErrors.length, 2)
})

test('_prepErrors - detects pool_connect_failed when pool_status is "1"', (t) => {
  const miner = makeStubMiner()
  const data = {
    estats: makeEstatsBase({ pool_status: '1' }),
    pools: makePoolsBase()
  }

  const result = miner._prepErrors(data)
  t.ok(result.isErrored)
  t.ok(result.errors.some(e => e.name === 'pool_connect_failed'))
})

test('setLED - throws ERR_INVALID_ARG_TYPE for non-boolean', async (t) => {
  const miner = makeStubMiner()
  await t.exception(() => miner.setLED('yes'), /ERR_INVALID_ARG_TYPE/)
  await t.exception(() => miner.setLED(1), /ERR_INVALID_ARG_TYPE/)
  await t.exception(() => miner.setLED(null), /ERR_INVALID_ARG_TYPE/)
})
