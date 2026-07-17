import { describe, expect, it } from 'vitest'

import { getTimelineDateFormat, timelineToMs } from '../line-chart.constants'

describe('timelineToMs', () => {
  it('should convert 20s to milliseconds', () => {
    expect(timelineToMs('20s')).toBe(20_000)
  })

  it('should convert 1m to milliseconds', () => {
    expect(timelineToMs('1m')).toBe(60_000)
  })

  it('should convert 5m to milliseconds', () => {
    expect(timelineToMs('5m')).toBe(300_000)
  })

  it('should convert 30m to milliseconds', () => {
    expect(timelineToMs('30m')).toBe(1_800_000)
  })

  it('should convert 1h to milliseconds', () => {
    expect(timelineToMs('1h')).toBe(3_600_000)
  })

  it('should convert 3h to milliseconds', () => {
    expect(timelineToMs('3h')).toBe(10_800_000)
  })

  it('should convert 1D to milliseconds', () => {
    expect(timelineToMs('1D')).toBe(86_400_000)
  })

  it('should default to 1h for unknown timeline', () => {
    expect(timelineToMs('unknown')).toBe(3_600_000)
  })
})

describe('getTimelineDateFormat', () => {
  it('should return HH:mm for minute timelines', () => {
    expect(getTimelineDateFormat('1m')).toBe('HH:mm')
    expect(getTimelineDateFormat('5m')).toBe('HH:mm')
    expect(getTimelineDateFormat('30m')).toBe('HH:mm')
  })

  it('should return HH:mm for 3h timeline', () => {
    expect(getTimelineDateFormat('3h')).toBe('HH:mm')
  })

  it('should return MMM dd for 1D timeline', () => {
    expect(getTimelineDateFormat('1D')).toBe('MMM dd')
  })

  it('should default to HH:mm for unknown timeline', () => {
    expect(getTimelineDateFormat('unknown')).toBe('HH:mm')
  })
})
