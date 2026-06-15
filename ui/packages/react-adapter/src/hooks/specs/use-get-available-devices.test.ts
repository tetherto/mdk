import { describe, expect, it } from 'vitest'

import { useGetAvailableDevices } from '../use-get-available-devices'

const makeDevice = (type: string) => ({ type })

describe('useGetAvailableDevices', () => {
  describe('empty / edge cases', () => {
    it('returns empty arrays when data is empty array', () => {
      const result = useGetAvailableDevices({ data: [] })
      expect(result.availableContainerTypes).toEqual([])
      expect(result.availableMinerTypes).toEqual([])
    })

    it('returns empty arrays when the inner devices array is empty', () => {
      const result = useGetAvailableDevices({ data: [[]] })
      expect(result.availableContainerTypes).toEqual([])
      expect(result.availableMinerTypes).toEqual([])
    })

    it('skips devices with no type field', () => {
      const result = useGetAvailableDevices({ data: [[{ id: '1' }]] })
      expect(result.availableContainerTypes).toEqual([])
      expect(result.availableMinerTypes).toEqual([])
    })

    it('skips devices with empty string type', () => {
      const result = useGetAvailableDevices({ data: [[makeDevice('')]] })
      expect(result.availableContainerTypes).toEqual([])
      expect(result.availableMinerTypes).toEqual([])
    })
  })

  describe('container classification', () => {
    it('adds a container- prefixed type to availableContainerTypes', () => {
      const result = useGetAvailableDevices({
        data: [[makeDevice('container-bd-d40-m30')]],
      })
      expect(result.availableContainerTypes).toContain('container-bd-d40-m30')
    })

    it('collects multiple distinct container types', () => {
      const result = useGetAvailableDevices({
        data: [[makeDevice('container-bd-d40-m30'), makeDevice('container-as-immersion')]],
      })
      expect(result.availableContainerTypes).toEqual([
        'container-bd-d40-m30',
        'container-as-immersion',
      ])
    })

    it('does not place container types in availableMinerTypes', () => {
      const result = useGetAvailableDevices({
        data: [[makeDevice('container-bd-d40-m30')]],
      })
      expect(result.availableMinerTypes).toEqual([])
    })
  })

  describe('miner classification', () => {
    it('adds a miner- prefixed type to availableMinerTypes', () => {
      const result = useGetAvailableDevices({
        data: [[makeDevice('miner-am-s21')]],
      })
      expect(result.availableMinerTypes).toContain('miner-am-s21')
    })

    it('collects multiple distinct miner types', () => {
      const result = useGetAvailableDevices({
        data: [[makeDevice('miner-am-s21'), makeDevice('miner-wm-m63')]],
      })
      expect(result.availableMinerTypes).toEqual(['miner-am-s21', 'miner-wm-m63'])
    })

    it('does not place miner types in availableContainerTypes', () => {
      const result = useGetAvailableDevices({
        data: [[makeDevice('miner-am-s21')]],
      })
      expect(result.availableContainerTypes).toEqual([])
    })
  })

  it('splits mixed container + miner types into their respective buckets', () => {
    const result = useGetAvailableDevices({
      data: [
        [
          makeDevice('miner-am-s21'),
          makeDevice('container-bd-d40-m30'),
          makeDevice('miner-wm-m63'),
        ],
      ],
    })
    expect(result.availableMinerTypes).toEqual(['miner-am-s21', 'miner-wm-m63'])
    expect(result.availableContainerTypes).toEqual(['container-bd-d40-m30'])
  })

  it('skips types that match neither prefix', () => {
    const result = useGetAvailableDevices({
      data: [[makeDevice('t-powermeter'), makeDevice('sensor-temp')]],
    })
    expect(result.availableMinerTypes).toEqual([])
    expect(result.availableContainerTypes).toEqual([])
  })
})
