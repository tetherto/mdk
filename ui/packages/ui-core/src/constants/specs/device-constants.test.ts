import { describe, expect, it } from 'vitest'
import {
  COMPLETE_MINER_TYPES,
  MINER_BRAND_NAMES,
  MINER_MODEL,
  MINER_TYPE,
  MinerStatuses,
} from '../device-constants'

describe('device constants', () => {
  describe('miner models', () => {
    it('should have miner model names', () => {
      expect(MINER_MODEL.AVALON).toBe('avalon')
      expect(MINER_MODEL.ANTMINER).toBe('antminer')
      expect(MINER_MODEL.WHATSMINER).toBe('whatsminer')
    })

    it('should have miner type codes', () => {
      expect(MINER_TYPE.AVALON).toBe('av')
      expect(MINER_TYPE.ANTMINER).toBe('am')
      expect(MINER_TYPE.WHATSMINER).toBe('wm')
    })

    it('should have brand names mapped to types', () => {
      expect(MINER_BRAND_NAMES[MINER_TYPE.AVALON]).toBe('Avalon')
      expect(MINER_BRAND_NAMES[MINER_TYPE.ANTMINER]).toBe('Antminer')
      expect(MINER_BRAND_NAMES[MINER_TYPE.WHATSMINER]).toBe('Whatsminer')
    })
  })

  describe('complete miner types', () => {
    it('should have specific miner models', () => {
      expect(COMPLETE_MINER_TYPES.ANTMINER_AM_S21).toBe('miner-am-s21')
      expect(COMPLETE_MINER_TYPES.WHATSMINER_WM_63).toBe('miner-wm-m63')
      expect(COMPLETE_MINER_TYPES.AVALON_AV_a1346).toBe('miner-av-a1346')
    })

    it('should have miner types with consistent naming', () => {
      Object.values(COMPLETE_MINER_TYPES).forEach((type) => {
        expect(type).toMatch(/^miner-/)
      })
    })

    it('should have all miner types defined', () => {
      const types = Object.values(COMPLETE_MINER_TYPES)
      expect(types.length).toBeGreaterThan(0)
    })
  })

  describe('miner statuses', () => {
    it('should have all miner status types', () => {
      expect(MinerStatuses.MINING).toBe('mining')
      expect(MinerStatuses.OFFLINE).toBe('offline')
      expect(MinerStatuses.SLEEPING).toBe('sleeping')
      expect(MinerStatuses.ERROR).toBe('error')
      expect(MinerStatuses.NOT_MINING).toBe('not_mining')
      expect(MinerStatuses.MAINTENANCE).toBe('maintenance')
      expect(MinerStatuses.ALERT).toBe('alert')
    })

    it('should have lowercase status values', () => {
      Object.values(MinerStatuses).forEach((status) => {
        expect(status).toBe(status.toLowerCase())
      })
    })

    it('should have all expected statuses', () => {
      const statuses = Object.values(MinerStatuses)
      expect(statuses).toHaveLength(7)
    })

    it('should have operational and non-operational statuses', () => {
      const statuses = Object.values(MinerStatuses)
      expect(statuses).toContain('mining')
      expect(statuses).toContain('offline')
      expect(statuses).toContain('sleeping')
      expect(statuses).toContain('error')
    })
  })
})
