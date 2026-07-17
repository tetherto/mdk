import { describe, expect, it } from 'vitest'
import { CONTAINER_STATUS, MINER_POWER_MODE } from '../status-utils'

describe('status utils', () => {
  describe('container status', () => {
    it('should have container status types', () => {
      expect(CONTAINER_STATUS.RUNNING).toBe('running')
      expect(CONTAINER_STATUS.OFFLINE).toBe('offline')
      expect(CONTAINER_STATUS.STOPPED).toBe('stopped')
    })

    it('should have all status types', () => {
      const statuses = Object.values(CONTAINER_STATUS)
      expect(statuses).toHaveLength(3)
    })
  })

  describe('miner power mode', () => {
    it('should have power mode types', () => {
      expect(MINER_POWER_MODE.SLEEP).toBe('sleep')
      expect(MINER_POWER_MODE.LOW).toBe('low')
      expect(MINER_POWER_MODE.NORMAL).toBe('normal')
      expect(MINER_POWER_MODE.HIGH).toBe('high')
    })

    it('should have all power modes', () => {
      const modes = Object.values(MINER_POWER_MODE)
      expect(modes).toHaveLength(4)
    })

    it('should have power modes as lowercase strings', () => {
      Object.values(MINER_POWER_MODE).forEach((mode) => {
        expect(mode).toBe(mode.toLowerCase())
      })
    })
  })
})
