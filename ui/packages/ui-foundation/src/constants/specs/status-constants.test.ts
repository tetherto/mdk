import { describe, expect, it } from 'vitest'
import {
  CONTAINER_STATUS,
  MINER_POWER_MODE,
  SITE_OVERVIEW_STATUSES,
  SOCKET_STATUSES,
} from '../status-constants'
import { MinerStatuses } from '../device-constants'

describe('status constants', () => {
  describe('CONTAINER_STATUS', () => {
    it('exposes the canonical lifecycle values', () => {
      expect(CONTAINER_STATUS.RUNNING).toBe('running')
      expect(CONTAINER_STATUS.OFFLINE).toBe('offline')
      expect(CONTAINER_STATUS.STOPPED).toBe('stopped')
    })
  })

  describe('MINER_POWER_MODE', () => {
    it('exposes the canonical power-mode values', () => {
      expect(MINER_POWER_MODE.SLEEP).toBe('sleep')
      expect(MINER_POWER_MODE.LOW).toBe('low')
      expect(MINER_POWER_MODE.NORMAL).toBe('normal')
      expect(MINER_POWER_MODE.HIGH).toBe('high')
    })
  })

  describe('SOCKET_STATUSES', () => {
    it('merges miner statuses + power modes + a few socket-specific extras', () => {
      // every MinerStatuses value is reachable
      for (const v of Object.values(MinerStatuses)) {
        expect(Object.values(SOCKET_STATUSES)).toContain(v)
      }
      // every MINER_POWER_MODE value is reachable
      for (const v of Object.values(MINER_POWER_MODE)) {
        expect(Object.values(SOCKET_STATUSES)).toContain(v)
      }
      expect(SOCKET_STATUSES.ERROR_MINING).toBe('errorMining')
      expect(SOCKET_STATUSES.MINER_DISCONNECTED).toBe('disconnected')
      expect(SOCKET_STATUSES.CONNECTING).toBe('connecting')
    })
  })

  describe('SITE_OVERVIEW_STATUSES', () => {
    it('exposes the four overview buckets', () => {
      expect(SITE_OVERVIEW_STATUSES.OFFLINE).toBe('offline')
      expect(SITE_OVERVIEW_STATUSES.EMPTY).toBe('empty')
      expect(SITE_OVERVIEW_STATUSES.NOT_MINING).toBe('not_mining')
      expect(SITE_OVERVIEW_STATUSES.MINING).toBe('mining')
    })
  })
})
