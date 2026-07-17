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
  STAT_5M,
  STAT_RTD,
  MAIN_DB,
  RUNNING_STATUS
} = require('../../lib/things/constants')

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

test('constants: base thing keys', (t) => {
  t.is(STAT_RTD, 'stat-rtd')
  t.is(MAIN_DB, 'main')
})

test('RUNNING_STATUS has running, stopped, error', (t) => {
  t.is(RUNNING_STATUS.RUNNING, 'running', 'RUNNING')
  t.is(RUNNING_STATUS.STOPPED, 'stopped', 'STOPPED')
  t.is(RUNNING_STATUS.ERROR, 'error', 'ERROR')
})

test('RUNNING_STATUS has exactly three keys', (t) => {
  t.is(Object.keys(RUNNING_STATUS).length, 3, 'three keys')
})
