'use strict'

const test = require('brittle')
const {
  getStartOfDay,
  convertMsToSeconds,
  getPeriodEndDate,
  aggregateByPeriod,
  getPeriodKey,
  isTimestampInPeriod,
  getFilteredPeriodData
} = require('../../../workers/lib/period.utils')

test('getStartOfDay - returns start of day timestamp', (t) => {
  const ts = 1700050000000
  const result = getStartOfDay(ts)
  t.ok(result <= ts, 'should be less than or equal to input')
  t.is(result % 86400000, 0, 'should be divisible by 86400000')
  t.pass()
})

test('getStartOfDay - already at start of day', (t) => {
  const ts = 1700006400000
  const result = getStartOfDay(ts)
  t.is(result, ts, 'should return same timestamp if already start of day')
  t.pass()
})

test('aggregateByPeriod - returns log unchanged for daily period', (t) => {
  const log = [
    { ts: 1700006400000, value: 10 },
    { ts: 1700092800000, value: 20 }
  ]
  const result = aggregateByPeriod(log, 'daily')
  t.is(result.length, 2, 'should return same length')
  t.alike(result, log, 'should return same entries')
  t.pass()
})

test('aggregateByPeriod - aggregates monthly', (t) => {
  const log = [
    { ts: 1700006400000, value: 10, region: 'us' },
    { ts: 1700092800000, value: 20, region: 'us' }
  ]
  const result = aggregateByPeriod(log, 'monthly')
  t.ok(result.length >= 1, 'should have at least one aggregated entry')
  t.ok(result[0].month, 'should have month field')
  t.ok(result[0].year, 'should have year field')
  t.pass()
})

test('aggregateByPeriod - aggregates yearly', (t) => {
  const log = [
    { ts: 1700006400000, value: 10, region: 'us' },
    { ts: 1700092800000, value: 20, region: 'us' }
  ]
  const result = aggregateByPeriod(log, 'yearly')
  t.ok(result.length >= 1, 'should have at least one aggregated entry')
  t.ok(result[0].year, 'should have year field')
  t.pass()
})

test('aggregateByPeriod - handles empty log', (t) => {
  const result = aggregateByPeriod([], 'monthly')
  t.is(result.length, 0, 'should return empty array')
  t.pass()
})

test('aggregateByPeriod - handles invalid timestamps', (t) => {
  const log = [
    { ts: 'invalid', value: 10 },
    { ts: 1700006400000, value: 20 }
  ]
  const result = aggregateByPeriod(log, 'monthly')
  t.ok(result.length >= 1, 'should skip invalid entries')
  t.pass()
})

test('aggregateByPeriod - meanKeys option averages instead of summing', (t) => {
  const ts = Date.UTC(2024, 0, 15)
  const log = [
    { ts, total: 10, rate: 0.1 },
    { ts: ts + 86400000, total: 20, rate: 0.3 }
  ]
  const result = aggregateByPeriod(log, 'monthly', [], { meanKeys: ['rate'] })
  t.is(result.length, 1, 'one monthly bucket')
  t.is(result[0].total, 30, 'sum keys still summed')
  t.is(result[0].rate, 0.2, 'mean key averaged: (0.1+0.3)/2')
})

test('aggregateByPeriod - meanKeys skip null/undefined values when averaging', (t) => {
  const ts = Date.UTC(2024, 0, 15)
  const log = [
    { ts, rate: 0.1 },
    { ts: ts + 86400000, rate: null },
    { ts: ts + 2 * 86400000, rate: 0.3 }
  ]
  const result = aggregateByPeriod(log, 'monthly', [], { meanKeys: ['rate'] })
  t.is(result[0].rate, 0.2, 'null skipped: (0.1+0.3)/2')
})

test('aggregateByPeriod - meanKeys returns null when no entries have the value', (t) => {
  const ts = Date.UTC(2024, 0, 15)
  const log = [
    { ts, rate: null },
    { ts: ts + 86400000, rate: undefined }
  ]
  const result = aggregateByPeriod(log, 'monthly', [], { meanKeys: ['rate'] })
  t.is(result[0].rate, null, 'all-null group yields null')
})

test('aggregateByPeriod - omitting options preserves legacy sum-everything behaviour', (t) => {
  const ts = Date.UTC(2024, 0, 15)
  const log = [
    { ts, rate: 0.1 },
    { ts: ts + 86400000, rate: 0.3 }
  ]
  const result = aggregateByPeriod(log, 'monthly')
  t.is(result[0].rate, 0.4, 'rate is summed when meanKeys not provided')
})

test('getPeriodKey - daily returns start of day', (t) => {
  const ts = 1700050000000
  const result = getPeriodKey(ts, 'daily')
  t.is(result % 86400000, 0, 'should be start of day')
  t.pass()
})

test('getPeriodKey - monthly returns start of month', (t) => {
  const ts = 1700050000000
  const result = getPeriodKey(ts, 'monthly')
  const date = new Date(result)
  t.is(date.getDate(), 1, 'should be first day of month')
  t.pass()
})

test('getPeriodKey - yearly returns start of year', (t) => {
  const ts = 1700050000000
  const result = getPeriodKey(ts, 'yearly')
  const date = new Date(result)
  t.is(date.getMonth(), 0, 'should be January')
  t.is(date.getDate(), 1, 'should be first day')
  t.pass()
})

test('isTimestampInPeriod - daily exact match', (t) => {
  const ts = 1700006400000
  t.ok(isTimestampInPeriod(ts, ts, 'daily'), 'should match exact timestamp')
  t.ok(!isTimestampInPeriod(ts + 86400000, ts, 'daily'), 'should not match different day')
  t.pass()
})

test('isTimestampInPeriod - monthly range', (t) => {
  const monthStart = new Date(2023, 10, 1).getTime()
  const midMonth = new Date(2023, 10, 15).getTime()
  const nextMonth = new Date(2023, 11, 1).getTime()

  t.ok(isTimestampInPeriod(midMonth, monthStart, 'monthly'), 'mid-month should be in period')
  t.ok(!isTimestampInPeriod(nextMonth, monthStart, 'monthly'), 'next month should not be in period')
  t.pass()
})

test('getFilteredPeriodData - daily returns direct lookup', (t) => {
  const data = { 1700006400000: { value: 42 } }
  const result = getFilteredPeriodData(data, 1700006400000, 'daily', () => null)
  t.alike(result, { value: 42 }, 'should return data for timestamp')
  t.pass()
})

test('getFilteredPeriodData - daily returns empty object for missing with default filterFn', (t) => {
  const data = {}
  const result = getFilteredPeriodData(data, 1700006400000, 'daily')
  t.alike(result, {}, 'should return empty object for missing data with default filterFn')
  t.pass()
})

test('getFilteredPeriodData - monthly filters with callback', (t) => {
  const monthStart = new Date(2023, 10, 1).getTime()
  const day1 = new Date(2023, 10, 5).getTime()
  const day2 = new Date(2023, 10, 15).getTime()
  const data = {
    [day1]: { value: 10 },
    [day2]: { value: 20 }
  }

  const result = getFilteredPeriodData(data, monthStart, 'monthly', (entries) => {
    return entries.reduce((sum, [, val]) => sum + val.value, 0)
  })

  t.is(result, 30, 'should sum values in period')
  t.pass()
})

test('convertMsToSeconds - converts milliseconds to seconds', (t) => {
  t.is(convertMsToSeconds(1700006400000), 1700006400, 'should convert ms to seconds')
  t.is(convertMsToSeconds(1700006400500), 1700006400, 'should floor fractional seconds')
  t.pass()
})

test('getPeriodEndDate - monthly returns next month', (t) => {
  const monthStart = new Date(2023, 10, 1).getTime()
  const result = getPeriodEndDate(monthStart, 'monthly')
  t.is(result.getMonth(), 11, 'should be next month')
  t.is(result.getFullYear(), 2023, 'should be same year')
  t.pass()
})

test('getPeriodEndDate - yearly returns next year', (t) => {
  const yearStart = new Date(2023, 0, 1).getTime()
  const result = getPeriodEndDate(yearStart, 'yearly')
  t.is(result.getFullYear(), 2024, 'should be next year')
  t.pass()
})
