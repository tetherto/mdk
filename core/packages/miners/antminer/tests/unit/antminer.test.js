'use strict'

const test = require('brittle')
const Antminer = require('../../lib/antminer.js')
const { POWER_MODE } = require('../../../../tpls/tpl-lib-miner/lib/utils/constants.js')

test('validateWriteAction accepts setPowerMode with SLEEP', (t) => {
  const miner = new Antminer({
    address: '127.0.0.1',
    port: 80,
    username: 'root',
    password: 'root'
  })
  t.execution(() => {
    miner.validateWriteAction('setPowerMode', POWER_MODE.SLEEP)
  })
  t.is(miner.validateWriteAction('setPowerMode', POWER_MODE.SLEEP), 1)
})

test('validateWriteAction accepts setPowerMode with NORMAL', (t) => {
  const miner = new Antminer({
    address: '127.0.0.1',
    port: 80,
    username: 'root',
    password: 'root'
  })
  t.execution(() => {
    miner.validateWriteAction('setPowerMode', POWER_MODE.NORMAL)
  })
  t.is(miner.validateWriteAction('setPowerMode', POWER_MODE.NORMAL), 1)
})

test('validateWriteAction throws for setPowerMode with invalid mode', (t) => {
  const miner = new Antminer({
    address: '127.0.0.1',
    port: 80,
    username: 'root',
    password: 'root'
  })
  try {
    miner.validateWriteAction('setPowerMode', 999)
    t.fail('expected throw')
  } catch (err) {
    t.is(err.message, 'ERR_SET_POWER_MODE_INVALID')
  }
})

test('Antminer constructor sets default errPort to 6060', (t) => {
  const miner = new Antminer({
    address: '127.0.0.1',
    port: 80,
    username: 'root',
    password: 'root'
  })
  t.is(miner.opts.errPort, 6060)
})

test('Antminer constructor preserves custom errPort', (t) => {
  const miner = new Antminer({
    address: '127.0.0.1',
    port: 80,
    errPort: 7070,
    username: 'root',
    password: 'root'
  })
  t.is(miner.opts.errPort, 7070)
})

test('_getStatus returns ERROR when isErrored', (t) => {
  const miner = new Antminer({
    address: '127.0.0.1',
    port: 80,
    username: 'root',
    password: 'root'
  })
  const { STATUS } = require('../../../../tpls/tpl-lib-miner/lib/utils/constants.js')
  t.is(miner._getStatus(true, { minerMode: 0 }), STATUS.ERROR)
})

test('_getStatus returns MINING when minerMode 0 and not errored', (t) => {
  const miner = new Antminer({
    address: '127.0.0.1',
    port: 80,
    username: 'root',
    password: 'root'
  })
  const { STATUS } = require('../../../../tpls/tpl-lib-miner/lib/utils/constants.js')
  t.is(miner._getStatus(false, { minerMode: 0 }), STATUS.MINING)
})

test('_getStatus returns SLEEPING when minerMode 1 and not errored', (t) => {
  const miner = new Antminer({
    address: '127.0.0.1',
    port: 80,
    username: 'root',
    password: 'root'
  })
  const { STATUS } = require('../../../../tpls/tpl-lib-miner/lib/utils/constants.js')
  t.is(miner._getStatus(false, { minerMode: 1 }), STATUS.SLEEPING)
})

test('_isSuspended returns true when minerMode 1', (t) => {
  const miner = new Antminer({
    address: '127.0.0.1',
    port: 80,
    username: 'root',
    password: 'root'
  })
  t.ok(miner._isSuspended({ minerMode: 1 }))
})

test('_isSuspended returns false when minerMode 0', (t) => {
  const miner = new Antminer({
    address: '127.0.0.1',
    port: 80,
    username: 'root',
    password: 'root'
  })
  t.absent(miner._isSuspended({ minerMode: 0 }))
})

test('_getPowerMode returns SLEEP when minerMode 1', (t) => {
  const miner = new Antminer({
    address: '127.0.0.1',
    port: 80,
    username: 'root',
    password: 'root'
  })
  t.is(miner._getPowerMode({ minerMode: 1 }), POWER_MODE.SLEEP)
})

test('_getPowerMode returns NORMAL when minerMode 0', (t) => {
  const miner = new Antminer({
    address: '127.0.0.1',
    port: 80,
    username: 'root',
    password: 'root'
  })
  t.is(miner._getPowerMode({ minerMode: 0 }), POWER_MODE.NORMAL)
})

test('_calcAvgTemp computes average of board chip temps', (t) => {
  const miner = new Antminer({
    address: '127.0.0.1',
    port: 80,
    username: 'root',
    password: 'root'
  })
  const stats = {
    boards: [
      { raw_temps: { chip: [50] } },
      { raw_temps: { chip: [60] } },
      { raw_temps: { chip: [70] } }
    ]
  }
  const avg = miner._calcAvgTemp(stats)
  t.is(avg, 60)
})

test('_calcEfficiency returns undefined for non-s19xp_h type', (t) => {
  const miner = new Antminer({
    address: '127.0.0.1',
    port: 80,
    username: 'root',
    password: 'root',
    type: 's19xp'
  })
  t.is(miner._calcEfficiency({ power: 3000 }, { mhs_av: 100 }), undefined)
})

test('_calcEfficiency returns value for s19xp_h when hashrate > 0', (t) => {
  const miner = new Antminer({
    address: '127.0.0.1',
    port: 80,
    username: 'root',
    password: 'root',
    type: 's19xp_h'
  })
  const efficiency = miner._calcEfficiency({ power: 3000 }, { mhs_av: 100 })
  t.ok(efficiency !== undefined)
  t.ok(parseFloat(efficiency) > 0)
})

test('_calcEfficiency returns 0 for s19xp_h when hashrate is 0', (t) => {
  const miner = new Antminer({
    address: '127.0.0.1',
    port: 80,
    username: 'root',
    password: 'root',
    type: 's19xp_h'
  })
  t.is(miner._calcEfficiency({ power: 3000 }, { mhs_av: 0 }), 0)
})
