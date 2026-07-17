import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TIMELINE_OPTIONS,
  getTimelineOptions,
  normalizeAlertSeverity,
  SEVERITY_WEIGHT,
} from '../dashboard-mappers'

describe('getTimelineOptions', () => {
  it('omits the 1-minute bucket by default (matches Mining OS dashboard)', () => {
    const opts = getTimelineOptions()
    expect(opts.map((o) => o.value)).toEqual(['5m', '30m', '3h', '1D'])
  })

  it('includes the 1-minute bucket when opted in', () => {
    const opts = getTimelineOptions({ includeOneMinute: true })
    expect(opts.map((o) => o.value)).toEqual(['1m', '5m', '30m', '3h', '1D'])
  })

  it('returns a new array — mutating it does not affect the default list', () => {
    const opts = getTimelineOptions()
    opts.pop()
    expect(DEFAULT_TIMELINE_OPTIONS.length).toBe(5)
  })
})

describe('normalizeAlertSeverity', () => {
  it.each([
    ['critical', 'critical'],
    ['CRITICAL', 'critical'],
    ['high', 'high'],
    ['HIGH', 'high'],
    ['medium', 'medium'],
    ['warning', 'medium'],
    ['warn', 'medium'],
  ] as const)('coerces %s -> %s', (input, expected) => {
    expect(normalizeAlertSeverity(input)).toBe(expected)
  })

  it('falls back to medium for unknown strings', () => {
    expect(normalizeAlertSeverity('foo')).toBe('medium')
  })

  it('falls back to medium for empty/null/undefined', () => {
    expect(normalizeAlertSeverity('')).toBe('medium')
    expect(normalizeAlertSeverity(null)).toBe('medium')
    expect(normalizeAlertSeverity(undefined)).toBe('medium')
  })
})

describe('SEVERITY_WEIGHT', () => {
  it('orders critical > high > medium', () => {
    expect(SEVERITY_WEIGHT.critical).toBeGreaterThan(SEVERITY_WEIGHT.high)
    expect(SEVERITY_WEIGHT.high).toBeGreaterThan(SEVERITY_WEIGHT.medium)
  })
})
