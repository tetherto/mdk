import { describe, expect, it } from 'vitest'

import { isEmpty, isNil, isPlainObject, isValidEmail, isValidUrl } from '../validation'

describe('validation', () => {
  describe('isEmpty', () => {
    it('returns true for null, undefined, empty string, empty array, empty object', () => {
      expect(isEmpty(null)).toBe(true)
      expect(isEmpty(undefined)).toBe(true)
      expect(isEmpty('')).toBe(true)
      expect(isEmpty('   ')).toBe(true)
      expect(isEmpty([])).toBe(true)
      expect(isEmpty({})).toBe(true)
    })

    it('returns false for non-empty values', () => {
      expect(isEmpty('hello')).toBe(false)
      expect(isEmpty([1])).toBe(false)
      expect(isEmpty({ a: 1 })).toBe(false)
      expect(isEmpty(0)).toBe(false)
      expect(isEmpty(false)).toBe(false)
    })
  })

  describe('isValidEmail', () => {
    it('validates correct emails', () => {
      expect(isValidEmail('user@example.com')).toBe(true)
      expect(isValidEmail('a@b.co')).toBe(true)
    })

    it('rejects invalid emails', () => {
      expect(isValidEmail('')).toBe(false)
      expect(isValidEmail('no-at-sign')).toBe(false)
      expect(isValidEmail('@missing-local.com')).toBe(false)
      expect(isValidEmail('user@')).toBe(false)
    })
  })

  describe('isValidUrl', () => {
    it('validates correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true)
      expect(isValidUrl('http://localhost:3000')).toBe(true)
    })

    it('rejects invalid URLs', () => {
      expect(isValidUrl('')).toBe(false)
      expect(isValidUrl('not-a-url')).toBe(false)
    })
  })

  describe('isNil', () => {
    it('should return true for null', () => {
      expect(isNil(null)).toBe(true)
    })

    it('should return true for undefined', () => {
      expect(isNil(undefined)).toBe(true)
    })

    it('should return false for 0', () => {
      expect(isNil(0)).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isNil('')).toBe(false)
    })

    it('should return false for false', () => {
      expect(isNil(false)).toBe(false)
    })

    it('should return false for NaN', () => {
      expect(isNil(Number.NaN)).toBe(false)
    })

    it('should return false for empty array', () => {
      expect(isNil([])).toBe(false)
    })

    it('should return false for empty object', () => {
      expect(isNil({})).toBe(false)
    })

    it('should return false for numbers', () => {
      expect(isNil(42)).toBe(false)
      expect(isNil(-1)).toBe(false)
      expect(isNil(3.14)).toBe(false)
    })

    it('should return false for strings', () => {
      expect(isNil('hello')).toBe(false)
      expect(isNil('0')).toBe(false)
    })
  })

  describe('isPlainObject', () => {
    it('should return true for plain objects', () => {
      expect(isPlainObject({})).toBe(true)
      expect(isPlainObject({ a: 1 })).toBe(true)
      expect(isPlainObject({ key: 'value', nested: { data: true } })).toBe(true)
    })

    it('should return false for null', () => {
      expect(isPlainObject(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isPlainObject(undefined)).toBe(false)
    })

    it('should return false for arrays', () => {
      expect(isPlainObject([])).toBe(false)
      expect(isPlainObject([1, 2, 3])).toBe(false)
      expect(isPlainObject([{ a: 1 }])).toBe(false)
    })

    it('should return false for primitives', () => {
      expect(isPlainObject(42)).toBe(false)
      expect(isPlainObject('string')).toBe(false)
      expect(isPlainObject(true)).toBe(false)
      expect(isPlainObject(false)).toBe(false)
    })

    it('should return false for Date objects', () => {
      expect(isPlainObject(new Date())).toBe(false)
    })

    it('should return false for RegExp', () => {
      expect(isPlainObject(/regex/)).toBe(false)
    })

    it('should return false for functions', () => {
      expect(isPlainObject(() => {})).toBe(false)
    })

    it('should return true for Object.create(null)', () => {
      expect(isPlainObject(Object.create(null))).toBe(true)
    })
  })
})
