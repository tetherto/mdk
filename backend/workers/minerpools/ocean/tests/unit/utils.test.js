'use strict'

const test = require('brittle')
const {
  getWorkersStats,
  getMonthlyDateRanges,
  isCurrentMonth,
  convertMsToSeconds,
  getTimeRanges
} = require('../../lib/utils')
const { HOUR_MS, HOURS_24_MS } = require('../../lib/utils/constants')

test('getWorkersStats maps Ocean workers object to stats rows', (t) => {
  const data = {
    snap_ts: 1700000000,
    workers: {
      'user.worker1': [{
        hashrate_60s: 100,
        hashrate_3600s: 200,
        hashrate_86400s: 300
      }]
    }
  }
  const out = getWorkersStats(data, 'user')
  t.is(out.length, 1)
  t.is(out[0].username, 'user')
  t.is(out[0].id, 'user.worker1')
  t.is(out[0].name, 'user.worker1')
  t.ok(out[0].online)
  t.is(out[0].hashrate, 100)
  t.is(out[0].hashrate_1h, 200)
  t.is(out[0].hashrate_24h, 300)
})

test('convertMsToSeconds floors ms to seconds', (t) => {
  t.is(convertMsToSeconds(1500), 1)
  t.is(convertMsToSeconds(1999), 1)
})

test('getTimeRanges returns hourly buckets between start and end', (t) => {
  const start = Date.UTC(2024, 0, 1, 10, 15, 0)
  const end = start + 3 * HOUR_MS
  const ranges = getTimeRanges(start, end, true)
  t.ok(ranges.length >= 2)
  t.is(ranges[0].start, start)
})

test('getTimeRanges empty when start >= end', (t) => {
  t.is(getTimeRanges(100, 100, true).length, 0)
})

test('getMonthlyDateRanges returns N month keys with API key strings', (t) => {
  const ranges = getMonthlyDateRanges(3)
  t.is(Object.keys(ranges).length, 3)
  const firstKey = Object.keys(ranges)[0]
  t.ok(/^\d+-\d{4}$/.test(firstKey))
  t.ok(typeof ranges[firstKey].key === 'string')
  t.ok(/^\d{4}-\d{1,2}$/.test(ranges[firstKey].key))
})

test('isCurrentMonth matches calendar month', (t) => {
  const m = new Date().getMonth() + 1
  const y = new Date().getFullYear()
  t.ok(isCurrentMonth(`${m}-${y}`))
  t.ok(!isCurrentMonth(`${m === 1 ? 12 : m - 1}-${y}`))
})

test('getTimeRanges daily mode uses HOURS_24_MS', (t) => {
  const start = Date.UTC(2024, 0, 1, 0, 0, 0)
  const end = start + 2 * HOURS_24_MS
  const ranges = getTimeRanges(start, end, false)
  t.ok(ranges.length >= 1)
})
