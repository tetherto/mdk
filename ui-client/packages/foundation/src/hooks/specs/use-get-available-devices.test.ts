import { describe, expect, it, vi } from 'vitest'

import type { Device } from '../../types'
import { useGetAvailableDevices } from '../use-get-available-devices'

vi.mock('../../utils/device-utils', () => ({
  isContainer: vi.fn((type: string) => type.includes('container')),
  isMiner: vi.fn((type: string) => type.includes('miner')),
}))

const makeDevice = (type: string) => ({ type })

describe('useGetAvailableDevices', () => {
  describe('empty / edge cases', () => {
    it('returns empty arrays when data is empty array', () => {
      const result = useGetAvailableDevices({ data: [] })
      expect(result.availableContainerTypes).toEqual([])
      expect(result.availableMinerTypes).toEqual([])
    })

    it('returns empty arrays when inner devices array is empty', () => {
      const result = useGetAvailableDevices({ data: [[] as unknown as Device] })
      expect(result.availableContainerTypes).toEqual([])
      expect(result.availableMinerTypes).toEqual([])
    })

    it('skips devices with no type field', () => {
      const result = useGetAvailableDevices({ data: [[{ id: '1' }] as unknown as Device] })
      expect(result.availableContainerTypes).toEqual([])
      expect(result.availableMinerTypes).toEqual([])
    })

    it('skips devices with empty string type', () => {
      const result = useGetAvailableDevices({
        data: [[makeDevice('')] as unknown as Device],
      })
      expect(result.availableContainerTypes).toEqual([])
      expect(result.availableMinerTypes).toEqual([])
    })
  })

  describe('container classification', () => {
    it('adds container type to availableContainerTypes', () => {
      const result = useGetAvailableDevices({
        data: [[makeDevice('t-container')] as unknown as Device],
      })
      expect(result.availableContainerTypes).toContain('t-container')
    })

    it('collects multiple distinct container types', () => {
      const result = useGetAvailableDevices({
        data: [[makeDevice('t-container'), makeDevice('container-immersion')] as unknown as Device],
      })
      expect(result.availableContainerTypes).toEqual(['t-container', 'container-immersion'])
    })

    it('does not add container type to availableMinerTypes', () => {
      const result = useGetAvailableDevices({
        data: [[makeDevice('t-container')] as unknown as Device],
      })
      expect(result.availableMinerTypes).toEqual([])
    })
  })

  describe('miner classification', () => {
    it('adds miner type to availableMinerTypes', () => {
      const result = useGetAvailableDevices({
        data: [[makeDevice('t-miner')] as unknown as Device],
      })
      expect(result.availableMinerTypes).toContain('t-miner')
    })

    it('collects multiple distinct miner types', () => {
      const result = useGetAvailableDevices({
        data: [[makeDevice('t-miner'), makeDevice('antminer-s19')] as unknown as Device],
      })
      expect(result.availableMinerTypes).toEqual(['t-miner', 'antminer-s19'])
    })

    it('does not add miner type to availableContainerTypes', () => {
      const result = useGetAvailableDevices({
        data: [[makeDevice('t-miner')] as unknown as Device],
      })
      expect(result.availableContainerTypes).toEqual([])
    })
  })

  describe('mixed devices', () => {
    it('correctly splits containers and miners into separate arrays', () => {
      const result = useGetAvailableDevices({
        data: [
          [
            makeDevice('t-container'),
            makeDevice('t-miner'),
            makeDevice('container-immersion'),
            makeDevice('antminer-s19'),
          ] as unknown as Device,
        ],
      })
      expect(result.availableContainerTypes).toEqual(['t-container', 'container-immersion'])
      expect(result.availableMinerTypes).toEqual(['t-miner', 'antminer-s19'])
    })

    it('skips unknown types that are neither container nor miner', () => {
      const result = useGetAvailableDevices({
        data: [[makeDevice('unknown-device'), makeDevice('t-miner')] as unknown as Device],
      })
      expect(result.availableContainerTypes).toEqual([])
      expect(result.availableMinerTypes).toEqual(['t-miner'])
    })
  })

  describe('return shape', () => {
    it('always returns availableContainerTypes as an array', () => {
      const result = useGetAvailableDevices({ data: [] })
      expect(Array.isArray(result.availableContainerTypes)).toBe(true)
    })

    it('always returns availableMinerTypes as an array', () => {
      const result = useGetAvailableDevices({ data: [] })
      expect(Array.isArray(result.availableMinerTypes)).toBe(true)
    })

    it('returns a new object on each call', () => {
      const a = useGetAvailableDevices({ data: [] })
      const b = useGetAvailableDevices({ data: [] })
      expect(a).not.toBe(b)
    })
  })
})
