import { describe, expect, it } from 'vitest'
import { DEVICE_STATUS } from '@/constants/devices'
import { getPumpStatus, pumpStatusToIndicatorColor } from '../bitmain-immersion-summary-box.utils'

describe('bitmain-immersion-summary-box.utils', () => {
  describe('getPumpStatus', () => {
    it('returns Error when pumpFault is true regardless of running', () => {
      expect(getPumpStatus(true, true)).toBe(DEVICE_STATUS.ERROR)
      expect(getPumpStatus(true, false)).toBe(DEVICE_STATUS.ERROR)
    })

    it('returns Running when not fault and isPumpRunning is true', () => {
      expect(getPumpStatus(false, true)).toBe(DEVICE_STATUS.RUNNING)
      expect(getPumpStatus(undefined, true)).toBe(DEVICE_STATUS.RUNNING)
    })

    it('returns Off when not fault and pump is not running', () => {
      expect(getPumpStatus(false, false)).toBe(DEVICE_STATUS.OFF)
      expect(getPumpStatus(false, undefined)).toBe(DEVICE_STATUS.OFF)
    })

    it('returns Off when both arguments are undefined', () => {
      expect(getPumpStatus(undefined, undefined)).toBe(DEVICE_STATUS.OFF)
    })

    it('prioritizes fault over running state', () => {
      expect(getPumpStatus(true, true)).toBe(DEVICE_STATUS.ERROR)
    })
  })

  describe('pumpStatusToIndicatorColor', () => {
    it('maps Error to red', () => {
      expect(pumpStatusToIndicatorColor(DEVICE_STATUS.ERROR)).toBe('red')
    })

    it('maps Running to green', () => {
      expect(pumpStatusToIndicatorColor(DEVICE_STATUS.RUNNING)).toBe('green')
    })

    it('maps Off to gray', () => {
      expect(pumpStatusToIndicatorColor(DEVICE_STATUS.OFF)).toBe('gray')
    })

    it('maps Unavailable to gray', () => {
      expect(pumpStatusToIndicatorColor(DEVICE_STATUS.UNAVAILABLE)).toBe('gray')
    })
  })
})
