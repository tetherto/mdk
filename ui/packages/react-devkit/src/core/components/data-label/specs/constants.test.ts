import { describe, expect, it } from 'vitest'

import { DATE, LABEL } from '../constants'

describe('dataLabel constants', () => {
  it('exposes date display tokens', () => {
    expect(DATE.FALLBACK).toBe('--/--/--')
    expect(DATE.SEPARATOR).toBe('-')
  })

  it('exposes label tokens', () => {
    expect(LABEL.DEFAULT).toBe('Period')
    expect(LABEL.SUFFIX).toBe(':')
  })
})
