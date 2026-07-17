import { describe, expect, it } from 'vitest'

import {
  convertKwToW,
  FALLBACK,
  formatChartDate,
  formatCountTo99Plus,
  formatCurrency,
  formatDate,
  formatErrors,
  formatHashrate,
  formatHashrateUnit,
  formatMacAddress,
  formatNumber,
  formatRelativeTime,
  formatUnit,
  formatValueUnit,
  getPercentFormattedNumber,
  showTotalTableCount,
  toCssSize,
  toTitleCase,
} from '../format'

describe('formatNumber', () => {
  it('formats numbers with locale', () => {
    expect(formatNumber(1234.567)).toBe('1,234.57')
    expect(formatNumber(1000)).toBe('1,000')
  })

  it('accepts string-encoded numbers', () => {
    expect(formatNumber('1234.56')).toBe('1,234.56')
  })

  it('uses maximumSignificantDigits when provided', () => {
    expect(formatNumber(0.0123, { maximumSignificantDigits: 2 })).toBe('0.012')
  })

  it('returns fallback for invalid input', () => {
    expect(formatNumber(null)).toBe('-')
    expect(formatNumber(undefined)).toBe('-')
  })

  it('handles -0', () => {
    expect(formatNumber(-0.001, { maximumFractionDigits: 0 })).toBe('0')
  })
})

describe('formatValueUnit', () => {
  it('places fiat symbols before the number', () => {
    expect(formatValueUnit(1234, '$')).toBe('$1,234')
    expect(formatValueUnit(1234, '€')).toBe('€1,234')
    expect(formatValueUnit(1234, '£')).toBe('£1,234')
    expect(formatValueUnit(1234, '¥')).toBe('¥1,234')
  })

  it('places other units after with a space', () => {
    expect(formatValueUnit(1234, 'BTC')).toBe('1,234 BTC')
  })

  it('returns only formatted value when no unit', () => {
    expect(formatValueUnit(1234)).toBe('1,234')
  })

  it('returns fallback when value is invalid', () => {
    expect(formatValueUnit(null as unknown as number, 'BTC', {}, 'N/A')).toBe('N/A')
  })
})

describe('toTitleCase', () => {
  it('converts various formats to Title Case', () => {
    expect(toTitleCase('hello_world')).toBe('Hello World')
    expect(toTitleCase('helloWorld')).toBe('Hello World')
    expect(toTitleCase('kebab-case')).toBe('Kebab Case')
  })
})

describe('formatCountTo99Plus', () => {
  it('formats counts', () => {
    expect(formatCountTo99Plus(5)).toBe('5')
    expect(formatCountTo99Plus(150)).toBe('99+')
    expect(formatCountTo99Plus(null)).toBe('N/A')
  })
})

describe('showTotalTableCount', () => {
  it('formats pagination string', () => {
    expect(showTotalTableCount(100, [1, 10])).toBe('1-10 of 100')
  })
})

describe('formatCurrency', () => {
  it('formats USD by default', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56')
  })

  it('formats other currencies', () => {
    expect(formatCurrency(1234.56, 'EUR')).toBe('€1,234.56')
  })
})

describe('formatMacAddress', () => {
  it('uppercases MAC address', () => {
    expect(formatMacAddress('aa:bb:cc')).toBe('AA:BB:CC')
  })

  it('returns empty string for undefined', () => {
    expect(formatMacAddress(undefined)).toBe('')
  })
})

describe('toCssSize', () => {
  it('converts numbers to px strings', () => {
    expect(toCssSize(16)).toBe('16px')
    expect(toCssSize(0)).toBe('0px')
  })

  it('passes strings through unchanged', () => {
    expect(toCssSize('2rem')).toBe('2rem')
    expect(toCssSize('100%')).toBe('100%')
  })

  it('returns undefined when no value is provided', () => {
    expect(toCssSize()).toBe(undefined)
    expect(toCssSize(undefined)).toBe(undefined)
  })
})

describe('fALLBACK', () => {
  it('is the default fallback string', () => {
    expect(FALLBACK).toBe('-')
  })
})

describe('formatHashrate', () => {
  it('formats hashrate with rounding', () => {
    expect(formatHashrate(1234.567)).toBe('1,234.57')
  })

  it('returns fallback for invalid input', () => {
    expect(formatHashrate('x')).toBe('-')
  })
})

describe('getPercentFormattedNumber', () => {
  it('formats as percentage', () => {
    expect(getPercentFormattedNumber(0.75)).toBe('75%')
    expect(getPercentFormattedNumber(0.1234, 1)).toBe('12.3%')
  })
})

describe('formatUnit', () => {
  it('formats ValueUnit object', () => {
    expect(formatUnit({ value: 1000, unit: 'MW' })).toBe('1,000 MW')
  })

  it('handles empty object', () => {
    expect(formatUnit({})).toBe('-')
  })
})

describe('formatHashrateUnit', () => {
  it('formats hashrate ValueUnit', () => {
    expect(formatHashrateUnit({ value: 100, unit: 'PH/s' })).toBe('100 PH/s')
  })
})

describe('formatErrors', () => {
  it('returns empty string for null or undefined', () => {
    expect(formatErrors(null)).toBe('')
    expect(formatErrors(undefined)).toBe('')
  })

  it('returns string as-is when errors is a string', () => {
    expect(formatErrors('Something failed')).toBe('Something failed')
  })

  it('formats array of errors with message only', () => {
    expect(formatErrors([{ msg: 'Error 1' }, { message: 'Error 2' }])).toContain('Error 1')
    expect(formatErrors([{ msg: 'Error 1' }, { message: 'Error 2' }])).toContain('Error 2')
  })

  it('formats errors with timestamp', () => {
    const ts = Date.now()
    const result = formatErrors([{ msg: 'Fail', timestamp: ts }])
    expect(result).toContain('Fail')
    expect(result).toContain(new Date(ts).toLocaleString())
  })

  it('uses getFormattedDate when provided', () => {
    const errors = [{ msg: 'Fail', timestamp: 1700000000000 }]
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    const result = formatErrors(errors, fmt)
    expect(result).toContain('Fail')
    expect(result).toContain('2023-11-14')
  })
})

describe('formatChartDate', () => {
  it('formats timestamp with year by default', () => {
    expect(formatChartDate(1700000000000)).toMatch(/\d{4}-\d{2}-\d{2}/)
  })

  it('formats without year when withYear is false', () => {
    expect(formatChartDate(1700000000000, false)).toMatch(/\d{2}-\d{2}/)
  })

  it('uses custom format template', () => {
    expect(formatChartDate(1700000000000, true, 'dd MMM')).toMatch(/\d{2} \w{3}/)
  })

  it('returns fallback for null or invalid', () => {
    expect(formatChartDate(null)).toBe('-')
    expect(formatChartDate('x', true, undefined, 'N/A')).toBe('N/A')
  })
})

describe('formatDate', () => {
  it('formats Date object', () => {
    expect(formatDate(new Date('2024-01-15'))).toContain('2024')
  })

  it('formats date string', () => {
    expect(formatDate('2024-01-15')).toContain('2024')
  })
})

describe('formatRelativeTime', () => {
  it('returns "just now" for recent date', () => {
    const now = new Date()
    expect(formatRelativeTime(now)).toBe('just now')
  })

  it('returns minutes ago', () => {
    const past = new Date(Date.now() - 5 * 60 * 1000)
    expect(formatRelativeTime(past)).toBe('5m ago')
  })

  it('returns hours ago', () => {
    const past = new Date(Date.now() - 2 * 3600 * 1000)
    expect(formatRelativeTime(past)).toBe('2h ago')
  })

  it('returns days ago', () => {
    const past = new Date(Date.now() - 3 * 86400 * 1000)
    expect(formatRelativeTime(past)).toBe('3d ago')
  })
})

describe('convertKwToW', () => {
  it('converts kW to W', () => {
    expect(convertKwToW(1)).toBe(1000)
    expect(convertKwToW('2.5')).toBe(2500)
  })
  it('returns NaN if string value was passed', () => {
    expect(convertKwToW('abc')).toBe(Number.NaN)
  })
})
