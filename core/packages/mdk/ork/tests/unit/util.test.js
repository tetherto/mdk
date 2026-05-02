'use strict'

const test = require('brittle')
const { daysTo24HrIntervals, isCurrentDay, getNestedProperty, sortThings, getValue } = require('../../workers/lib/util')

test('daysTo24HrIntervals', async (t) => {
  t.test('should generate intervals for 1 day', async (t) => {
    const intervals = daysTo24HrIntervals(1)
    t.is(intervals.length, 1, 'should return 1 interval')
    t.ok(intervals[0].startTs, 'should have startTs')
    t.ok(intervals[0].endTs, 'should have endTs')
    t.is(intervals[0].index, 0, 'should have index 0')
    t.ok(intervals[0].endTs >= intervals[0].startTs, 'endTs should be >= startTs')
  })

  t.test('should generate intervals for multiple days', async (t) => {
    const days = 3
    const intervals = daysTo24HrIntervals(days)
    t.is(intervals.length, days, 'should return correct number of intervals')

    for (let i = 0; i < intervals.length; i++) {
      t.is(intervals[i].index, i, `interval ${i} should have correct index`)
      if (i > 0) {
        t.ok(intervals[i].endTs <= intervals[i - 1].startTs, 'intervals should be sequential')
      }
    }
  })

  t.test('should handle UTC offset', async (t) => {
    const utcOffsetMs = 5 * 60 * 60 * 1000 // 5 hours
    const intervals = daysTo24HrIntervals(1, utcOffsetMs)
    t.is(intervals.length, 1, 'should return 1 interval')
    t.ok(intervals[0].startTs, 'should have startTs')
    t.ok(intervals[0].endTs, 'should have endTs')
  })

  t.test('should generate intervals with correct 24-hour spacing', async (t) => {
    const intervals = daysTo24HrIntervals(2)
    const MS_24_HOURS = 24 * 60 * 60 * 1000
    // Check the difference between start times of consecutive intervals
    const diff = intervals[0].startTs - intervals[1].startTs
    // Should be exactly 24 hours apart
    t.is(diff, MS_24_HOURS, 'intervals should be exactly 24 hours apart')
  })
})

test('isCurrentDay', async (t) => {
  t.test('should return true for current timestamp', async (t) => {
    const now = Date.now()
    t.ok(isCurrentDay(now), 'current timestamp should be current day')
  })

  t.test('should return false for yesterday', async (t) => {
    const yesterday = Date.now() - (24 * 60 * 60 * 1000)
    t.not(isCurrentDay(yesterday), 'yesterday should not be current day')
  })

  t.test('should handle UTC offset', async (t) => {
    const utcOffsetMs = 5 * 60 * 60 * 1000 // 5 hours
    const now = Date.now()
    const result = isCurrentDay(now, utcOffsetMs)
    t.ok(typeof result === 'boolean', 'should return boolean')
  })

  t.test('should return false for future date', async (t) => {
    const tomorrow = Date.now() + (24 * 60 * 60 * 1000)
    t.not(isCurrentDay(tomorrow), 'tomorrow should not be current day')
  })
})

test('getNestedProperty', async (t) => {
  t.test('should get top-level property', async (t) => {
    const obj = { name: 'test', value: 123 }
    t.is(getNestedProperty(obj, ['name']), 'test', 'should return top-level property')
    t.is(getNestedProperty(obj, ['value']), 123, 'should return top-level property')
  })

  t.test('should get nested property', async (t) => {
    const obj = {
      level1: {
        level2: {
          value: 'nested'
        }
      }
    }
    t.is(getNestedProperty(obj, ['level1', 'level2', 'value']), 'nested', 'should return nested property')
  })

  t.test('should return undefined for missing property', async (t) => {
    const obj = { name: 'test' }
    t.is(getNestedProperty(obj, ['missing']), undefined, 'should return undefined for missing property')
    t.is(getNestedProperty(obj, ['level1', 'level2']), undefined, 'should return undefined for missing nested property')
  })

  t.test('should handle null/undefined object', async (t) => {
    t.is(getNestedProperty(null, ['prop']), undefined, 'should return undefined for null')
    t.is(getNestedProperty(undefined, ['prop']), undefined, 'should return undefined for undefined')
  })

  t.test('should handle empty path', async (t) => {
    const obj = { name: 'test' }
    try {
      getNestedProperty(obj, [])
      t.fail('should throw or return undefined for empty path')
    } catch (err) {
      t.pass('should handle empty path gracefully')
    }
  })

  t.test('should handle array indices in path', async (t) => {
    const obj = {
      items: [
        { name: 'first' },
        { name: 'second' }
      ]
    }
    t.is(getNestedProperty(obj, ['items', '0', 'name']), 'first', 'should handle array indices')
  })
})

test('getValue', async (t) => {
  t.test('should read nested path', async (t) => {
    const obj = { a: { b: { c: 7 } } }
    t.is(getValue(obj, 'a.b.c'), 7)
  })

  t.test('should return undefined for missing path', async (t) => {
    t.is(getValue({ a: 1 }, 'a.b.c'), undefined)
  })
})

test('sortThings', async (t) => {
  t.test('should return 1 when sortBy is empty', async (t) => {
    t.is(sortThings({ a: 1 }, { a: 2 }, {}), 1)
    t.is(sortThings({ a: 1 }, { a: 2 }, null), 1)
  })

  t.test('should sort numerically when parts are numeric', async (t) => {
    const a = { name: 'item2' }
    const b = { name: 'item10' }
    t.ok(sortThings(a, b, { name: 1 }) < 0, '2 before 10')
  })

  t.test('should sort lexicographically when not numeric', async (t) => {
    const x = { name: 'b' }
    const y = { name: 'a' }
    t.ok(sortThings(x, y, { name: 1 }) > 0)
  })

  t.test('should order undefined vs defined keys', async (t) => {
    const cmp = sortThings({ k: undefined }, { k: 1 }, { k: 1 })
    t.ok(typeof cmp === 'number')
    t.not(cmp, 0, 'undefined and 1 should not be equal for sort')
  })

  t.test('should use length diff when shared prefix matches', async (t) => {
    t.ok(sortThings({ id: 'a' }, { id: 'ab' }, { id: 1 }) < 0, 'shorter key sorts first ascending')
  })

  t.test('should return 0 when all sort keys tie', async (t) => {
    const row = { n: 5 }
    t.is(sortThings(row, { ...row }, { n: 1 }), 0)
  })
})
