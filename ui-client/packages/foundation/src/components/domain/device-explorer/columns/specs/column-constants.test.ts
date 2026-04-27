import { describe, expect, it } from 'vitest'
import { CELL_MIN_WIDTH, ERROR_MESSAGES } from '../column-constants'

describe('column constants', () => {
  it('should have cell minimum width', () => {
    expect(CELL_MIN_WIDTH).toBe(120)
    expect(CELL_MIN_WIDTH).toBeGreaterThan(0)
  })

  it('should have reasonable min width value', () => {
    expect(CELL_MIN_WIDTH).toBeGreaterThanOrEqual(100)
    expect(CELL_MIN_WIDTH).toBeLessThanOrEqual(200)
  })

  describe('error messages', () => {
    it('should have connection failure error', () => {
      expect(ERROR_MESSAGES.ERR_THING_CONNECTION_FAILURE).toBe('No Connection')
    })

    it('should have error messages as non-empty strings', () => {
      Object.values(ERROR_MESSAGES).forEach((message) => {
        expect(typeof message).toBe('string')
        expect(message.length).toBeGreaterThan(0)
      })
    })

    it('should have user-friendly error messages', () => {
      Object.values(ERROR_MESSAGES).forEach((message) => {
        expect(message).not.toMatch(/^ERR_/)
        expect(message).not.toMatch(/_/)
      })
    })
  })
})
