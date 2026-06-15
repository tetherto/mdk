import { describe, expect, it } from 'vitest'
import { API_ERRORS, INVALID_MAC_ADDRESS_ERROR } from '../errors'

describe('error constants', () => {
  it('should have MAC address error message', () => {
    expect(INVALID_MAC_ADDRESS_ERROR).toContain('valid format')
    expect(INVALID_MAC_ADDRESS_ERROR).toContain('00:1A:2B:3C:4D:5E')
  })

  it('should have API error codes', () => {
    expect(API_ERRORS.ERR_ORK_ACTION_CALLS_EMPTY).toBe('ERR_ORK_ACTION_CALLS_EMPTY')
  })

  it('should have all API errors as uppercase with ERR prefix', () => {
    Object.values(API_ERRORS).forEach((error) => {
      expect(error).toMatch(/^ERR_/)
      expect(error).toBe(error.toUpperCase())
    })
  })
})
