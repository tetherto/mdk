import { describe, expect, it } from 'vitest'

import { cn } from '../cn'

describe('cn', () => {
  it('merges string class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional class names', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
    expect(cn('foo', true && 'bar', 'baz')).toBe('foo bar baz')
  })

  it('handles object syntax', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
  })

  it('handles mixed inputs', () => {
    expect(cn('base', { active: true, disabled: false }, 'extra')).toBe('base active extra')
  })

  it('handles empty inputs', () => {
    expect(cn()).toBe('')
    expect(cn('')).toBe('')
    expect(cn(null, undefined)).toBe('')
  })

  it('handles arrays', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
    expect(cn(['foo', false && 'bar', 'baz'])).toBe('foo baz')
  })
})
