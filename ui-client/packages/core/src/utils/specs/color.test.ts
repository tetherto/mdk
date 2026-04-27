import { describe, expect, it } from 'vitest'
import { hexToRgba } from '../color'

describe('hexToRgba', () => {
  it.each([
    ['#FF5733', 0.5, 'rgba(255, 87, 51, 0.5)'],
    ['FF5733', 0.5, 'rgba(255, 87, 51, 0.5)'],
    ['#ff5733', 0.5, 'rgba(255, 87, 51, 0.5)'],
    ['aabbcc', 0.8, 'rgba(170, 187, 204, 0.8)'],
    ['#000000', 1, 'rgba(0, 0, 0, 1)'],
    ['#FFFFFF', 0, 'rgba(255, 255, 255, 0)'],
  ])('converts %s with opacity %s', (hex, opacity, expected) => {
    expect(hexToRgba(hex, opacity)).toBe(expected)
  })

  it('supports shorthand hex (#fff)', () => {
    expect(hexToRgba('#fff', 0.5)).toBe('rgba(255, 255, 255, 0.5)')
    expect(hexToRgba('000', 1)).toBe('rgba(0, 0, 0, 1)')
  })

  it('returns original value for invalid hex', () => {
    expect(hexToRgba('invalid', 0.5)).toBe('invalid')
    expect(hexToRgba('#GGG', 0.5)).toBe('#GGG')
    expect(hexToRgba('', 0.5)).toBe('')
  })

  it('clamps opacity between 0 and 1', () => {
    expect(hexToRgba('#FF0000', -1)).toBe('rgba(255, 0, 0, 0)')
    expect(hexToRgba('#FF0000', 2)).toBe('rgba(255, 0, 0, 1)')
  })
})
