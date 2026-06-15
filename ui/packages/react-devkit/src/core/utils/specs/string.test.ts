import { describe, expect, it } from 'vitest'

import {
  getLocationLabel,
  getMajorLocation,
  getMinorLocation,
  getRolesFromAuthToken,
  normalizeHexColor,
  safeString,
} from '../string'

describe('getRolesFromAuthToken', () => {
  it('extracts roles from token', () => {
    expect(getRolesFromAuthToken('prefix_roles:admin:viewer:')).toEqual(['admin', 'viewer'])
  })

  it('returns empty array for missing token', () => {
    expect(getRolesFromAuthToken(undefined)).toEqual([])
    expect(getRolesFromAuthToken('')).toEqual([])
  })
})

describe('getLocationLabel', () => {
  it('formats location strings', () => {
    expect(getLocationLabel('site_a.lab_1')).toBe('Site A Lab 1')
  })

  it('returns Unknown for null or "unknown"', () => {
    expect(getLocationLabel(null)).toBe('Unknown')
    expect(getLocationLabel('unknown')).toBe('Unknown')
  })
})

describe('getMajorLocation / getMinorLocation', () => {
  it('splits site.location correctly', () => {
    expect(getMajorLocation('brazil.lab_1')).toBe('brazil')
    expect(getMinorLocation('brazil.lab_1')).toBe('lab_1')
  })

  it('returns unknown for invalid format', () => {
    expect(getMajorLocation('invalid')).toBe('unknown')
    expect(getMinorLocation('no-dot')).toBe('unknown')
  })
})

describe('normalizeHexColor', () => {
  it('strips leading #', () => {
    expect(normalizeHexColor('#ff0000')).toBe('ff0000')
    expect(normalizeHexColor('ff0000')).toBe('ff0000')
  })
})

describe('safeString', () => {
  it('returns empty string for null or undefined', () => {
    expect(safeString(null)).toBe('')
    expect(safeString(undefined)).toBe('')
  })

  it('returns string representation for other types', () => {
    expect(safeString(123)).toBe('123')
    expect(safeString(true)).toBe('true')
    expect(safeString({})).toBe('[object Object]')
  })
})
