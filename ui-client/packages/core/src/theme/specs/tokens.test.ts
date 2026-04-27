import { describe, expect, it } from 'vitest'

import { borderRadius, colors, fontSize, spacing } from '../tokens'

describe('theme tokens', () => {
  describe('colors', () => {
    it('exposes primary scale 50–900', () => {
      expect(colors.primary).toBeDefined()
      expect(colors.primary[50]).toBe('hsl(222, 47%, 95%)')
      expect(colors.primary[500]).toBe('hsl(222, 47%, 50%)')
      expect(colors.primary[900]).toBe('hsl(222, 47%, 11.2%)')
    })

    it('exposes gray scale 50–900', () => {
      expect(colors.gray).toBeDefined()
      expect(colors.gray[50]).toBe('hsl(210, 40%, 98%)')
      expect(colors.gray[900]).toBe('hsl(222, 47%, 11%)')
    })
  })

  describe('spacing', () => {
    it('exposes spacing scale', () => {
      expect(spacing[0]).toBe('0')
      expect(spacing[1]).toBe('0.25rem')
      expect(spacing[4]).toBe('1rem')
      expect(spacing[24]).toBe('6rem')
    })
  })

  describe('borderRadius', () => {
    it('exposes radius values', () => {
      expect(borderRadius.none).toBe('0')
      expect(borderRadius.DEFAULT).toBe('0.25rem')
      expect(borderRadius.full).toBe('9999px')
    })
  })

  describe('fontSize', () => {
    it('exposes font size scale', () => {
      expect(fontSize.xs).toBe('0.75rem')
      expect(fontSize.base).toBe('1rem')
      expect(fontSize['5xl']).toBe('3rem')
    })
  })
})
