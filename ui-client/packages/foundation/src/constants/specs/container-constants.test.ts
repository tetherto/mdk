import { describe, expect, it } from 'vitest'
import {
  COMPLETE_CONTAINER_TYPE,
  CONTAINER_MODEL,
  CONTAINER_SETTINGS_MODEL,
  CONTAINER_TYPE,
  CONTAINER_TYPE_NAME_MAP,
} from '../container-constants'

describe('container constants', () => {
  describe('container models', () => {
    it('should have container model names', () => {
      expect(CONTAINER_MODEL.BITDEER).toBe('bitdeer')
      expect(CONTAINER_MODEL.BITMAIN).toBe('bitmain')
      expect(CONTAINER_MODEL.MICROBT).toBe('microbt')
      expect(CONTAINER_MODEL.ANTSPACE).toBe('antspace')
      expect(CONTAINER_MODEL.BITMAIN_HYDRO).toBe('bitmain-hydro')
      expect(CONTAINER_MODEL.ANTSPACE_HYDRO).toBe('antspace-hydro')
    })

    it('should have threshold mappings', () => {
      expect(CONTAINER_MODEL.BITDEER_THRESHOLD).toBe('bitdeer')
      expect(CONTAINER_MODEL.MICROBT_THRESHOLD).toBe('microbt')
      expect(CONTAINER_MODEL.HYDRO_THRESHOLD).toBe('hydro')
      expect(CONTAINER_MODEL.IMMERSION_THRESHOLD).toBe('immersion')
    })
  })

  describe('container settings model', () => {
    it('should have API query codes', () => {
      expect(CONTAINER_SETTINGS_MODEL.BITDEER).toBe('bd')
      expect(CONTAINER_SETTINGS_MODEL.MICROBT).toBe('mbt')
      expect(CONTAINER_SETTINGS_MODEL.HYDRO).toBe('hydro')
      expect(CONTAINER_SETTINGS_MODEL.IMMERSION).toBe('immersion')
    })
  })

  describe('container types', () => {
    it('should have container type codes', () => {
      expect(CONTAINER_TYPE.BITDEER).toBe('bd')
      expect(CONTAINER_TYPE.ANTSPACE).toBe('as')
      expect(CONTAINER_TYPE.MICROBT).toBe('mbt')
      expect(CONTAINER_TYPE.ANTSPACE_HYDRO).toBe('as-hk3')
      expect(CONTAINER_TYPE.ANTSPACE_IMMERSION).toBe('as-immersion')
    })

    it('should have short codes for types', () => {
      Object.values(CONTAINER_TYPE).forEach((type) => {
        expect(type.length).toBeLessThanOrEqual(13)
      })
    })
  })

  describe('complete container types', () => {
    it('should have specific container models', () => {
      expect(COMPLETE_CONTAINER_TYPE.BITMAIN_HYDRO).toBe('container-as-hk3')
      expect(COMPLETE_CONTAINER_TYPE.BITDEER_M30).toBe('container-bd-d40-m30')
      expect(COMPLETE_CONTAINER_TYPE.MICROBT_KEHUA).toBe('container-mbt-kehua')
      expect(COMPLETE_CONTAINER_TYPE.BITMAIN_IMMERSION).toBe('container-as-immersion')
    })

    it('should have container types with consistent prefix', () => {
      Object.values(COMPLETE_CONTAINER_TYPE).forEach((type) => {
        expect(type).toMatch(/^container-/)
      })
    })
  })

  describe('container type names', () => {
    it('should have readable names for container types', () => {
      expect(CONTAINER_TYPE_NAME_MAP[COMPLETE_CONTAINER_TYPE.BITDEER_M30]).toBe('Bitdeer M30')
      expect(CONTAINER_TYPE_NAME_MAP[COMPLETE_CONTAINER_TYPE.BITMAIN_HYDRO]).toBe('Bitmain Hydro')
      expect(CONTAINER_TYPE_NAME_MAP[COMPLETE_CONTAINER_TYPE.MICROBT_KEHUA]).toBe('MicroBT Kehua')
    })

    it('should have names as readable strings', () => {
      Object.values(CONTAINER_TYPE_NAME_MAP).forEach((name) => {
        expect(typeof name).toBe('string')
        expect(name.length).toBeGreaterThan(0)
      })
    })
  })
})
