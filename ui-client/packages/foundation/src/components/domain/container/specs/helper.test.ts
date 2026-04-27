import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ContainerStats, Device } from '../../../../types/device'
import { appendContainerToTag, appendIdToTag } from '../../../../utils/device-utils'
import {
  getAllSelectedContainerIds,
  getAllSelectedContainerInfo,
  getContainerActionPayload,
  getContainerState,
} from '../helper'

vi.mock('../../../../utils/device-utils', () => ({
  appendContainerToTag: vi.fn((container) => `container:${container}`),
  appendIdToTag: vi.fn((id) => `id:${id}`),
}))

vi.mock('../../../../utils/status-utils', () => ({
  CONTAINER_STATUS: {
    RUNNING: 'running',
    STOPPED: 'stopped',
    OFFLINE: 'offline',
  },
}))

describe('helper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAllSelectedContainerInfo', () => {
    const mockDevices = [
      { id: '1', info: { container: 'container-1' } },
      { id: '2', info: { container: 'container-2' } },
      { id: '3', info: { container: 'container-3' } },
    ] as unknown as Device[]

    describe('isTag = true', () => {
      it('returns tagged container strings', () => {
        const result = getAllSelectedContainerInfo(mockDevices, true)
        expect(result).toEqual([
          'container:container-1',
          'container:container-2',
          'container:container-3',
        ])
      })

      it('calls appendContainerToTag for each device', () => {
        getAllSelectedContainerInfo(mockDevices, true)
        expect(appendContainerToTag).toHaveBeenCalledTimes(3)
        expect(appendContainerToTag).toHaveBeenCalledWith('container-1')
        expect(appendContainerToTag).toHaveBeenCalledWith('container-2')
        expect(appendContainerToTag).toHaveBeenCalledWith('container-3')
      })

      it('filters out devices with no container', () => {
        const devices = [
          { id: '1', info: { container: 'container-1' } },
          { id: '2', info: {} },
          { id: '3' },
        ] as unknown as Device[]

        const result = getAllSelectedContainerInfo(devices, true)
        expect(result).toEqual(['container:container-1'])
      })
    })

    describe('isTag = false', () => {
      it('returns raw container strings', () => {
        const result = getAllSelectedContainerInfo(mockDevices, false)
        expect(result).toEqual(['container-1', 'container-2', 'container-3'])
      })

      it('does not call appendContainerToTag', () => {
        getAllSelectedContainerInfo(mockDevices, false)
        expect(appendContainerToTag).not.toHaveBeenCalled()
      })

      it('filters out devices with no container', () => {
        const devices = [
          { id: '1', info: { container: 'container-1' } },
          { id: '2', info: {} },
          { id: '3' },
        ] as unknown as Device[]

        const result = getAllSelectedContainerInfo(devices, false)
        expect(result).toEqual(['container-1'])
      })
    })

    describe('edge cases', () => {
      it('returns empty array when devices is empty', () => {
        const result = getAllSelectedContainerInfo([], true)
        expect(result).toEqual([])
      })

      it('returns empty array when all devices have no container', () => {
        const devices = [{ id: '1' }, { id: '2', info: {} }] as unknown as Device[]

        const result = getAllSelectedContainerInfo(devices, true)
        expect(result).toEqual([])
      })

      it('handles devices with undefined info', () => {
        const devices = [{ id: '1', info: undefined }] as unknown as Device[]
        const result = getAllSelectedContainerInfo(devices, true)
        expect(result).toEqual([])
      })

      it('returns string[] type (filters undefined)', () => {
        const devices = [
          { id: '1', info: { container: 'container-1' } },
          { id: '2' },
        ] as unknown as Device[]
        const result = getAllSelectedContainerInfo(devices, false)
        result.forEach((item) => expect(typeof item).toBe('string'))
      })
    })
  })

  describe('getAllSelectedContainerIds', () => {
    const mockDevices = [
      { id: 'device-1' },
      { id: 'device-2' },
      { id: 'device-3' },
    ] as unknown as Device[]

    it('returns tagged id strings for all devices', () => {
      const result = getAllSelectedContainerIds(mockDevices)
      expect(result).toEqual(['id:device-1', 'id:device-2', 'id:device-3'])
    })

    it('calls appendIdToTag for each device', () => {
      getAllSelectedContainerIds(mockDevices)
      expect(appendIdToTag).toHaveBeenCalledTimes(3)
      expect(appendIdToTag).toHaveBeenCalledWith('device-1')
      expect(appendIdToTag).toHaveBeenCalledWith('device-2')
      expect(appendIdToTag).toHaveBeenCalledWith('device-3')
    })

    it('filters out devices with no id', () => {
      const devices = [{ id: 'device-1' }, {}, { id: 'device-3' }] as unknown as Device[]
      const result = getAllSelectedContainerIds(devices)
      expect(result).toEqual(['id:device-1', 'id:device-3'])
    })

    it('returns empty array when devices is empty', () => {
      const result = getAllSelectedContainerIds([])
      expect(result).toEqual([])
    })

    it('returns empty array when all devices have no id', () => {
      const devices = [{}, { info: { container: 'container-1' } }] as unknown as Device[]

      const result = getAllSelectedContainerIds(devices)
      expect(result).toEqual([])
    })

    it('returns string[] type (filters undefined)', () => {
      const result = getAllSelectedContainerIds(mockDevices)
      result.forEach((item) => expect(typeof item).toBe('string'))
    })
  })

  describe('getContainerActionPayload', () => {
    const mockSelectedDevices = [
      { id: 'device-1', info: { container: 'container-1' } },
      { id: 'device-2', info: { container: 'container-2' } },
    ] as unknown as Device[]

    const mockData = {
      id: 'device-1',
      info: { container: 'container-1' },
    } as unknown as Device

    describe('isBatch = true', () => {
      it('returns batch payload with all device ids', () => {
        const result = getContainerActionPayload(true, mockSelectedDevices, mockData)
        expect(result.idTags).toEqual(['id:device-1', 'id:device-2'])
      })

      it('returns batch payload with all container info', () => {
        const result = getContainerActionPayload(true, mockSelectedDevices, mockData)
        expect(result.containerInfo).toEqual(['container-1', 'container-2'])
      })

      it('ignores data param and uses selectedDevices', () => {
        const differentData = { id: 'different-device' } as unknown as Device
        const result = getContainerActionPayload(true, mockSelectedDevices, differentData)
        expect(result.idTags).toEqual(['id:device-1', 'id:device-2'])
      })

      it('returns empty arrays when selectedDevices is empty', () => {
        const result = getContainerActionPayload(true, [], mockData)
        expect(result.idTags).toEqual([])
        expect(result.containerInfo).toEqual([])
      })
    })

    describe('isBatch = false', () => {
      it('returns single device payload with id tag', () => {
        const result = getContainerActionPayload(false, mockSelectedDevices, mockData)
        expect(result.idTags).toEqual(['id:device-1'])
      })

      it('returns single device payload with container info', () => {
        const result = getContainerActionPayload(false, mockSelectedDevices, mockData)
        expect(result.containerInfo).toEqual(['container-1'])
      })

      it('ignores selectedDevices and uses data', () => {
        const result = getContainerActionPayload(false, [], mockData)
        expect(result.idTags).toEqual(['id:device-1'])
        expect(result.containerInfo).toEqual(['container-1'])
      })

      it('returns empty idTags when data has no id', () => {
        const dataWithoutId = { info: { container: 'container-1' } } as unknown as Device
        const result = getContainerActionPayload(false, mockSelectedDevices, dataWithoutId)
        expect(result.idTags).toEqual([])
      })

      it('returns empty containerInfo when data has no container', () => {
        const dataWithoutContainer = { id: 'device-1' } as unknown as Device
        const result = getContainerActionPayload(false, mockSelectedDevices, dataWithoutContainer)
        expect(result.containerInfo).toEqual([])
      })

      it('returns empty arrays when data has no id and no container', () => {
        const emptyData = {} as unknown as Device
        const result = getContainerActionPayload(false, mockSelectedDevices, emptyData)
        expect(result.idTags).toEqual([])
        expect(result.containerInfo).toEqual([])
      })
    })
  })

  describe('getContainerState', () => {
    describe('isStarted', () => {
      it('returns isStarted true when status is RUNNING', () => {
        const containerData = { status: 'running' } as ContainerStats
        const result = getContainerState(containerData)
        expect(result.isStarted).toBe(true)
      })

      it('returns isStarted false when status is STOPPED', () => {
        const containerData = { status: 'stopped' } as ContainerStats
        const result = getContainerState(containerData)
        expect(result.isStarted).toBe(false)
      })

      it('returns isStarted false when status is OFFLINE', () => {
        const containerData = { status: 'offline' } as ContainerStats
        const result = getContainerState(containerData)
        expect(result.isStarted).toBe(false)
      })

      it('returns isStarted false when status is undefined', () => {
        const containerData = {} as ContainerStats
        const result = getContainerState(containerData)
        expect(result.isStarted).toBe(false)
      })
    })

    describe('isAllSocketsOn', () => {
      it('returns isAllSocketsOn true when all pdus have status 1', () => {
        const containerData = {
          container_specific: {
            pdu_data: [
              { status: 1, power_w: 0 },
              { status: 1, power_w: 0 },
            ],
          },
        } as ContainerStats

        const result = getContainerState(containerData)
        expect(result.isAllSocketsOn).toBe(true)
      })

      it('returns isAllSocketsOn true when all pdus have power_w > 0', () => {
        const containerData = {
          container_specific: {
            pdu_data: [
              { status: 0, power_w: 100 },
              { status: 0, power_w: 200 },
            ],
          },
        } as ContainerStats

        const result = getContainerState(containerData)
        expect(result.isAllSocketsOn).toBe(true)
      })

      it('returns isAllSocketsOn true when mix of status 1 and power_w > 0', () => {
        const containerData = {
          container_specific: {
            pdu_data: [
              { status: 1, power_w: 0 },
              { status: 0, power_w: 200 },
            ],
          },
        } as ContainerStats

        const result = getContainerState(containerData)
        expect(result.isAllSocketsOn).toBe(true)
      })

      it('returns isAllSocketsOn false when one pdu has status 0 and power_w 0', () => {
        const containerData = {
          container_specific: {
            pdu_data: [
              { status: 1, power_w: 100 },
              { status: 0, power_w: 0 },
            ],
          },
        } as ContainerStats

        const result = getContainerState(containerData)
        expect(result.isAllSocketsOn).toBe(false)
      })

      it('returns isAllSocketsOn false when all pdus have status 0 and power_w 0', () => {
        const containerData = {
          container_specific: {
            pdu_data: [
              { status: 0, power_w: 0 },
              { status: 0, power_w: 0 },
            ],
          },
        } as ContainerStats

        const result = getContainerState(containerData)
        expect(result.isAllSocketsOn).toBe(false)
      })

      it('returns isAllSocketsOn true when pdu_data is empty array', () => {
        const containerData = {
          container_specific: { pdu_data: [] },
        } as unknown as ContainerStats

        const result = getContainerState(containerData)
        expect(result.isAllSocketsOn).toBe(true)
      })

      it('returns isAllSocketsOn true when pdu_data is undefined', () => {
        const containerData = {
          container_specific: {},
        } as ContainerStats

        const result = getContainerState(containerData)
        expect(result.isAllSocketsOn).toBe(true)
      })

      it('returns isAllSocketsOn true when container_specific is undefined', () => {
        const containerData = {} as ContainerStats
        const result = getContainerState(containerData)
        expect(result.isAllSocketsOn).toBe(true)
      })

      it('handles undefined power_w defaulting to 0', () => {
        const containerData = {
          container_specific: {
            pdu_data: [{ status: 0, power_w: undefined }],
          },
        } as ContainerStats

        const result = getContainerState(containerData)
        expect(result.isAllSocketsOn).toBe(false)
      })
    })

    describe('combined state', () => {
      it('returns correct combined state for running container with all sockets on', () => {
        const containerData = {
          status: 'running',
          container_specific: {
            pdu_data: [
              { status: 1, power_w: 100 },
              { status: 1, power_w: 200 },
            ],
          },
        } as ContainerStats

        const result = getContainerState(containerData)
        expect(result).toEqual({ isStarted: true, isAllSocketsOn: true })
      })

      it('returns correct combined state for stopped container with sockets off', () => {
        const containerData = {
          status: 'stopped',
          container_specific: {
            pdu_data: [{ status: 0, power_w: 0 }],
          },
        } as ContainerStats

        const result = getContainerState(containerData)
        expect(result).toEqual({ isStarted: false, isAllSocketsOn: false })
      })

      it('returns correct combined state for empty containerData', () => {
        const result = getContainerState({} as ContainerStats)
        expect(result).toEqual({ isStarted: false, isAllSocketsOn: true })
      })
    })
  })
})
