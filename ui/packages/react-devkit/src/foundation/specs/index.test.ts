import { describe, expect, it } from 'vitest'
import { version } from '../index'

describe('foundation package', () => {
  it('should export version', () => {
    expect(version).toBeDefined()
    expect(typeof version).toBe('string')
  })

  it('should have semantic version format', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/)
  })
})
