'use strict'

const test = require('brittle')
const {
  isCurrentMonth,
  convertMsToSeconds,
  getTimeRanges
} = require('../../lib/utils/time')
const { HOUR_MS, HOURS_24_MS } = require('../../lib/utils/constants')

test('convertMsToSeconds floors ms to seconds', (t) => {
  t.is(convertMsToSeconds(1500), 1)
  t.is(convertMsToSeconds(1999), 1)
  t.is(convertMsToSeconds(2000), 2)
})

test('getTimeRanges empty when start >= end', (t) => {
  t.is(getTimeRanges(100, 100, true).length, 0)
})

test('getTimeRanges returns hourly buckets between start and end', (t) => {
  const start = Date.UTC(2024, 0, 1, 10, 15, 0)
  const end = start + 3 * HOUR_MS
  const ranges = getTimeRanges(start, end, true)
  t.ok(ranges.length >= 2)
  t.is(ranges[0].start, start)
})

test('getTimeRanges daily mode uses HOURS_24_MS', (t) => {
  const start = Date.UTC(2024, 0, 1, 0, 0, 0)
  const end = start + 2 * HOURS_24_MS
  const ranges = getTimeRanges(start, end, false)
  t.ok(ranges.length >= 1)
})

test('isCurrentMonth matches calendar month', (t) => {
  const m = new Date().getMonth() + 1
  const y = new Date().getFullYear()
  t.ok(isCurrentMonth(`${m}-${y}`))
  t.ok(!isCurrentMonth(`${m === 1 ? 12 : m - 1}-${y}`))
})
