'use strict'

const test = require('brittle')
const {
  getWorkersStats,
  getMonthlyDateRanges,
  isCurrentMonth,
  convertMsToSeconds,
  getTimeRanges
} = require('../../lib/utils')

test('getWorkersStats maps API workers to stats rows', (t) => {
  const workers = [
    {
      host: 'h1',
      status: 0,
      last_share_at: '2024-01-01',
      hash_rate_info: {
        name: 'w1',
        hash_rate: 100,
        h1_hash_rate: 10,
        h24_hash_rate: 20,
        h1_stale_hash_rate: 1,
        h24_stale_hash_rate: 2
      }
    }
  ]
  const out = getWorkersStats(workers, 'user1')
  t.is(out.length, 1)
  t.is(out[0].username, 'user1')
  t.is(out[0].id, 'h1')
  t.is(out[0].name, 'w1')
  t.ok(out[0].online)
  t.is(out[0].hashrate, 100)
})

test('convertMsToSeconds floors ms to seconds', (t) => {
  t.is(convertMsToSeconds(1500), 1)
  t.is(convertMsToSeconds(1999), 1)
})

test('getTimeRanges empty when start >= end', (t) => {
  t.is(getTimeRanges(100, 100, true).length, 0)
})

test('getMonthlyDateRanges returns N month keys', (t) => {
  const ranges = getMonthlyDateRanges(3)
  t.is(Object.keys(ranges).length, 3)
  const firstKey = Object.keys(ranges)[0]
  t.ok(/^\d+-\d{4}$/.test(firstKey))
  t.ok(ranges[firstKey].startDate < ranges[firstKey].endDate)
})

test('isCurrentMonth matches calendar month', (t) => {
  const m = new Date().getMonth() + 1
  const y = new Date().getFullYear()
  t.ok(isCurrentMonth(`${m}-${y}`))
  t.ok(!isCurrentMonth(`${m === 1 ? 12 : m - 1}-${y}`))
})
