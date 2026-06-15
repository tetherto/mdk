'use strict'

const { test } = require('brittle')
const {
  MAINTENANCE,
  STATUS,
  POWER_MODE,
  DEFAULT_THRESHOLD_HASHRATE,
  STAT_SHARES_1M,
  STAT_SHARES_30M,
  STAT_30M,
  MINER_TAG,
  STAT_STARTUP_STATUS,
  STAT_5M
} = require('../../lib/utils/constants')

test('constants: MAINTENANCE', (t) => {
  t.is(MAINTENANCE, 'maintenance')
})

test('constants: STATUS', (t) => {
  t.is(STATUS.OFFLINE, 'offline')
  t.is(STATUS.SLEEPING, 'sleeping')
  t.is(STATUS.MINING, 'mining')
  t.is(STATUS.ERROR, 'error')
  t.is(STATUS.NOT_MINING, 'not_mining')
})

test('constants: POWER_MODE', (t) => {
  t.is(POWER_MODE.LOW, 'low')
  t.is(POWER_MODE.NORMAL, 'normal')
  t.is(POWER_MODE.HIGH, 'high')
  t.is(POWER_MODE.SLEEP, 'sleep')
})

test('constants: DEFAULT_THRESHOLD_HASHRATE', (t) => {
  t.is(DEFAULT_THRESHOLD_HASHRATE, 50000000)
})

test('constants: stat keys', (t) => {
  t.is(STAT_SHARES_1M, 'stat-shares-1m')
  t.is(STAT_SHARES_30M, 'stat-shares-30m')
  t.is(STAT_30M, 'stat-30m')
  t.is(MINER_TAG, 't-miner')
  t.is(STAT_STARTUP_STATUS, 'stat-startup')
  t.is(STAT_5M, 'stat-5m')
})
