import { describe, expect, it, vi } from 'vitest'
import {
  breakTimeIntoIntervals,
  fetchHistoricalAlertsInChunks,
  mergeAlertsByUuid,
  type TimeInterval,
} from '../historical-log-chunks'
import { ONE_DAY_MS } from '../alert-queries'

describe('breakTimeIntoIntervals', () => {
  it('splits a 3-day range into three 24h windows clamped to end', () => {
    const start = 0
    const end = 3 * ONE_DAY_MS
    expect(breakTimeIntoIntervals(start, end, ONE_DAY_MS)).toEqual([
      { start: 0, end: ONE_DAY_MS },
      { start: ONE_DAY_MS, end: 2 * ONE_DAY_MS },
      { start: 2 * ONE_DAY_MS, end: 3 * ONE_DAY_MS },
    ])
  })

  it('clamps the final partial window to end', () => {
    const windows = breakTimeIntoIntervals(0, ONE_DAY_MS + 1000, ONE_DAY_MS)
    expect(windows).toHaveLength(2)
    expect(windows[1]).toEqual({ start: ONE_DAY_MS, end: ONE_DAY_MS + 1000 })
  })

  it('returns [] for empty or inverted ranges', () => {
    expect(breakTimeIntoIntervals(100, 100)).toEqual([])
    expect(breakTimeIntoIntervals(200, 100)).toEqual([])
    expect(breakTimeIntoIntervals(Number.NaN, 100)).toEqual([])
  })

  it('defaults to a 24h interval', () => {
    expect(breakTimeIntoIntervals(0, 2 * ONE_DAY_MS)).toHaveLength(2)
  })
})

describe('mergeAlertsByUuid', () => {
  it('appends new rows and replaces matching uuids (later wins)', () => {
    const prev = [{ uuid: 'a', v: 1 }]
    const next = [
      { uuid: 'a', v: 2 },
      { uuid: 'b', v: 1 },
    ]
    expect(mergeAlertsByUuid(prev, next)).toEqual([
      { uuid: 'a', v: 2 },
      { uuid: 'b', v: 1 },
    ])
  })

  it('always appends rows without a uuid', () => {
    const merged = mergeAlertsByUuid([{ uuid: undefined }], [{ uuid: undefined }])
    expect(merged).toHaveLength(2)
  })
})

describe('fetchHistoricalAlertsInChunks', () => {
  it('fetches each window oldest→newest and merges by uuid', async () => {
    const seen: TimeInterval[] = []
    const fetchWindow = vi.fn(async (w: TimeInterval) => {
      seen.push(w)
      return [{ uuid: `u-${w.start}` }]
    })
    const result = await fetchHistoricalAlertsInChunks({ start: 0, end: 2 * ONE_DAY_MS }, fetchWindow)
    expect(fetchWindow).toHaveBeenCalledTimes(2)
    expect(seen[0].start).toBe(0)
    expect(seen[1].start).toBe(ONE_DAY_MS)
    expect(result).toEqual([{ uuid: 'u-0' }, { uuid: `u-${ONE_DAY_MS}` }])
  })

  it('swallows individual window failures without dropping the range', async () => {
    const fetchWindow = vi.fn(async (w: TimeInterval) => {
      if (w.start === 0) throw new Error('boom')
      return [{ uuid: 'ok' }]
    })
    const result = await fetchHistoricalAlertsInChunks({ start: 0, end: 2 * ONE_DAY_MS }, fetchWindow)
    expect(result).toEqual([{ uuid: 'ok' }])
  })

  it('stops early when the signal is aborted', async () => {
    const controller = new AbortController()
    const fetchWindow = vi.fn(async () => {
      controller.abort()
      return [{ uuid: 'first' }]
    })
    const result = await fetchHistoricalAlertsInChunks(
      { start: 0, end: 3 * ONE_DAY_MS },
      fetchWindow,
      { signal: controller.signal },
    )
    expect(fetchWindow).toHaveBeenCalledTimes(1)
    expect(result).toEqual([{ uuid: 'first' }])
  })
})
