'use strict'

const test = require('brittle')
const { sign, toNumber, previousDay, getMonthlyDateRanges, getWorkersStats } = require('../../lib/utils')

test('HMAC matches an independent fixed vector including subaccount', t => {
  t.is(sign({ apiKey: 'key', apiSecret: 'secret', timestamp: '1700000000', subaccountId: 'sub' }),
    '5268e3601c3037fbb55b01cc91d3acabf1e815d6baeffe10f331c383049a2aeb')
})

test('numeric conversion preserves real zeros and rejects absent or invalid readings', t => {
  t.is(toNumber('0.00000001', 'amount'), 1e-8)
  t.is(toNumber(0, 'amount'), 0)
  for (const value of [null, undefined, '', ' ', false, [], 'NaN', 'Infinity', Infinity, '12btc', '9'.repeat(400)]) {
    t.exception(() => toNumber(value, 'amount'), /ERR_EMCD_DATA amount/)
  }
})

test('UTC day and month ranges handle year boundaries and leap days', t => {
  t.is(previousDay('2026-01-01T00:00:00Z').date, '2025-12-31')
  t.is(previousDay('2024-03-01T00:00:00Z').date, '2024-02-29')
  const ranges = getMonthlyDateRanges('2026-01-01T00:00:00Z')
  t.is(ranges.length, 12)
  t.is(ranges[0].month, '1-2026')
  t.is(ranges[11].month, '2-2025')
})

test('malformed workers fail instead of being counted as offline', t => {
  t.exception(() => getWorkersStats([{ worker: 'rig', active: 2 }], 'account'), /ERR_EMCD_DATA/)
})

test('Go omitempty on active represents an offline worker', t => {
  const [worker] = getWorkersStats([{
    worker: 'rig', workerName: 'rig', hashrate: 0, hashrate1h: 0, hashrate24h: 0, lastbeat: 0
  }], 'account')
  t.is(worker.online, 0)
})
