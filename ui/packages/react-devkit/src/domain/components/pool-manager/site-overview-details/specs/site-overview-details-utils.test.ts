import { describe, expect, it } from 'vitest'
import { MinerStatuses } from '@domain/constants/device-constants'
import type { MinerData, PduSocket } from '../use-site-overview-details-data'
import type { Device } from '@domain/types'
import { DEVICE_NOT_FOUND_MESSAGE } from '@domain/utils/device-utils'
import { SITE_OVERVIEW_STATUSES } from '../../pool-manager-constants'
import type { MinerStatusInput } from '../site-overview-details-utils'
import {
  getMinerInSocket,
  getMinersPoolName,
  getMinerStatus,
  getSelectableName,
  getSocketStatus,
  getUnitRowLabel,
  resolveAssignPoolDevices,
  socketHasMiner,
} from '../site-overview-details-utils'

const makeMiner = (url?: string) =>
  ({
    last: {
      snap: {
        config: url ? { pool_config: [{ url }] } : { pool_config: [] },
      },
    },
  }) as never

const makeMinerStatus = (status?: string, error?: string): MinerStatusInput => ({
  error,
  snap: { stats: { status } },
})

const makeSocketItem = (pduIndex: string, socketIndex: string): string =>
  JSON.stringify({ pduIndex, socketIndex })

const makeMinerData = (id: string, status: string, overrides: Partial<MinerData> = {}): MinerData =>
  ({
    id,
    hashrate: { value: '100', unit: 'MH/s' },
    snap: { stats: { status } },
    ...overrides,
  }) as MinerData

const makeDevice = (id: string, code = `CODE-${id}`): Device => ({ id, code }) as unknown as Device

describe('site overview details utils', () => {
  describe('getMinersPoolName', () => {
    it('returns empty string when miners is undefined', () => {
      expect(getMinersPoolName(undefined)).toBe('')
    })

    it('returns empty string when miners array is empty', () => {
      expect(getMinersPoolName([])).toBe('')
    })

    it('returns empty string when no miner has a snap config', () => {
      expect(getMinersPoolName([{ last: {} } as never])).toBe('')
    })

    it('returns empty string when pool_config is empty', () => {
      expect(getMinersPoolName([makeMiner()])).toBe('')
    })

    it('extracts second-level domain from a standard pool URL', () => {
      expect(getMinersPoolName([makeMiner('stratum+tcp://us.pool.example.com:3333')])).toBe(
        'example',
      )
    })

    it('extracts second-level domain from a two-part hostname', () => {
      expect(getMinersPoolName([makeMiner('stratum+tcp://pool.com:3333')])).toBe('pool')
    })

    it('returns empty string for an invalid URL', () => {
      expect(getMinersPoolName([makeMiner('not-a-valid-url')])).toBe('')
    })

    it('returns empty string when pool URL is undefined', () => {
      expect(getMinersPoolName([makeMiner(undefined)])).toBe('')
    })

    it('uses the first miner that has a snap config', () => {
      const miners = [
        { last: {} } as never,
        makeMiner('stratum+tcp://us.pool.alpha.com:3333'),
        makeMiner('stratum+tcp://us.pool.beta.com:3333'),
      ]
      expect(getMinersPoolName(miners)).toBe('alpha')
    })
  })

  describe('getMinerStatus', () => {
    it('returns EMPTY when miner is undefined', () => {
      expect(getMinerStatus(undefined)).toBe(SITE_OVERVIEW_STATUSES.EMPTY)
    })

    it('returns EMPTY when miner error is "Device Not Found"', () => {
      expect(getMinerStatus({ error: DEVICE_NOT_FOUND_MESSAGE })).toBe(SITE_OVERVIEW_STATUSES.EMPTY)
    })

    it('returns OFFLINE when miner has no error and no status', () => {
      expect(getMinerStatus({})).toBe(SITE_OVERVIEW_STATUSES.OFFLINE)
    })

    it('returns OFFLINE when status is an unrecognised value', () => {
      expect(getMinerStatus(makeMinerStatus('connecting'))).toBe(SITE_OVERVIEW_STATUSES.OFFLINE)
    })

    it('returns OFFLINE when status is sleeping', () => {
      expect(getMinerStatus(makeMinerStatus(MinerStatuses.SLEEPING))).toBe(
        SITE_OVERVIEW_STATUSES.OFFLINE,
      )
    })

    it('returns OFFLINE when status is error', () => {
      expect(getMinerStatus(makeMinerStatus(MinerStatuses.ERROR))).toBe(
        SITE_OVERVIEW_STATUSES.OFFLINE,
      )
    })

    it('returns MINING when status is mining', () => {
      expect(getMinerStatus(makeMinerStatus(MinerStatuses.MINING))).toBe(
        SITE_OVERVIEW_STATUSES.MINING,
      )
    })

    it('returns NOT_MINING when status is not_mining', () => {
      expect(getMinerStatus(makeMinerStatus(MinerStatuses.NOT_MINING))).toBe(
        SITE_OVERVIEW_STATUSES.NOT_MINING,
      )
    })

    it('ignores non-"Device Not Found" errors and resolves by status', () => {
      expect(getMinerStatus(makeMinerStatus(MinerStatuses.MINING, 'Some other error'))).toBe(
        SITE_OVERVIEW_STATUSES.MINING,
      )
    })

    it('returns OFFLINE when snap is absent', () => {
      expect(getMinerStatus({ error: undefined })).toBe(SITE_OVERVIEW_STATUSES.OFFLINE)
    })
  })

  describe('getUnitRowLabel', () => {
    it('returns "Rack {pdu}"', () => {
      expect(getUnitRowLabel({ pdu: 'A' } as never)).toBe('Rack A')
      expect(getUnitRowLabel({ pdu: '1' } as never)).toBe('Rack 1')
    })
  })

  describe('getMinerInSocket', () => {
    it('returns the correct miner from the hashmap based on pdu and socket', () => {
      const minersHashmap = {
        A_1: { name: 'Miner A1' },
        A_2: { name: 'Miner A2' },
        B_1: { name: 'Miner B1' },
      } as unknown as Record<string, MinerData>

      expect(
        getMinerInSocket({
          minersHashmap,
          pdu: { pdu: 'A' } as never,
          socket: { socket: '1' } as PduSocket,
        }),
      ).toEqual({ name: 'Miner A1' })
      expect(
        getMinerInSocket({
          minersHashmap,
          pdu: { pdu: 'A' } as never,
          socket: { socket: '2' } as PduSocket,
        }),
      ).toEqual({ name: 'Miner A2' })
      expect(
        getMinerInSocket({
          minersHashmap,
          pdu: { pdu: 'B' } as never,
          socket: { socket: '1' } as PduSocket,
        }),
      ).toEqual({ name: 'Miner B1' })
    })

    it('returns undefined if no miner is found for the given pdu and socket', () => {
      const minersHashmap = {
        A_1: { name: 'Miner A1' },
      } as unknown as Record<string, MinerData>

      expect(
        getMinerInSocket({
          minersHashmap,
          pdu: { pdu: 'A' } as never,
          socket: { socket: '2' } as PduSocket,
        }),
      ).toBeUndefined()
      expect(
        getMinerInSocket({
          minersHashmap,
          pdu: { pdu: 'B' } as never,
          socket: { socket: '1' } as PduSocket,
        }),
      ).toBeUndefined()
    })
  })

  describe('getSocketStatus', () => {
    it('returns the status of the miner in the given socket', () => {
      const minersHashmap = {
        A_1: { name: 'Miner A1', status: SITE_OVERVIEW_STATUSES.OFFLINE },
      } as unknown as Record<string, MinerData>

      expect(
        getSocketStatus({
          minersHashmap,
          pdu: { pdu: 'A' },
          socket: { socket: '1' } as PduSocket,
        }),
      ).toBe(SITE_OVERVIEW_STATUSES.OFFLINE)
    })

    it('returns EMPTY if there is no miner in the given socket', () => {
      const minersHashmap = {} as unknown as Record<string, MinerData>

      expect(
        getSocketStatus({
          minersHashmap,
          pdu: { pdu: 'A' } as never,
          socket: { socket: '1' } as PduSocket,
        }),
      ).toBe(SITE_OVERVIEW_STATUSES.EMPTY)
    })
  })

  describe('socketHasMiner', () => {
    it('returns true if there is a miner in the given socket', () => {
      const minersHashmap = {
        A_1: { name: 'Miner A1' },
      } as unknown as Record<string, MinerData>

      expect(
        socketHasMiner({
          minersHashmap,
          pdu: { pdu: 'A' } as never,
          socket: { socket: '1' } as PduSocket,
        }),
      ).toBe(true)
    })

    it('returns false if there is no miner in the given socket', () => {
      const minersHashmap = {} as unknown as Record<string, MinerData>

      expect(
        socketHasMiner({
          minersHashmap,
          pdu: { pdu: 'A' } as never,
          socket: { socket: '1' } as PduSocket,
        }),
      ).toBe(false)
    })

    it('returns false if the miner in the given socket has a "Device Not Found" error', () => {
      const minersHashmap = {
        A_1: { name: 'Miner A1', error: DEVICE_NOT_FOUND_MESSAGE },
      } as unknown as Record<string, MinerData>

      expect(
        socketHasMiner({
          minersHashmap,
          pdu: { pdu: 'A' } as never,
          socket: { socket: '1' } as PduSocket,
        }),
      ).toBe(false)
    })
  })
  describe('resolveAssignPoolDevices', () => {
    describe('return shape', () => {
      it('returns devices array and hasEligibleDevices flag', () => {
        const result = resolveAssignPoolDevices(new Set(), {}, [])
        expect(Array.isArray(result.devices)).toBe(true)
        expect(typeof result.hasEligibleDevices).toBe('boolean')
      })

      it('returns empty devices and false when selectedItems is empty', () => {
        const result = resolveAssignPoolDevices(new Set(), {}, [])
        expect(result.devices).toHaveLength(0)
        expect(result.hasEligibleDevices).toBe(false)
      })
    })

    describe('eligible status filtering', () => {
      it('includes miner with MINING status', () => {
        const hashmap = { '1_1': makeMinerData('m1', MinerStatuses.MINING) }
        const connected = [makeDevice('m1')]
        const { devices } = resolveAssignPoolDevices(
          new Set([makeSocketItem('1', '1')]),
          hashmap,
          connected,
        )
        expect(devices).toHaveLength(1)
        expect(devices[0].id).toBe('m1')
      })

      it('includes miner with NOT_MINING status', () => {
        const hashmap = { '1_1': makeMinerData('m1', MinerStatuses.NOT_MINING) }
        const connected = [makeDevice('m1')]
        const { devices } = resolveAssignPoolDevices(
          new Set([makeSocketItem('1', '1')]),
          hashmap,
          connected,
        )
        expect(devices).toHaveLength(1)
      })

      it('excludes miner with OFFLINE status', () => {
        const hashmap = { '1_1': makeMinerData('m1', MinerStatuses.OFFLINE) }
        const connected = [makeDevice('m1')]
        const { devices } = resolveAssignPoolDevices(
          new Set([makeSocketItem('1', '1')]),
          hashmap,
          connected,
        )
        expect(devices).toHaveLength(0)
      })

      it('excludes miner with SLEEPING status', () => {
        const hashmap = { '1_1': makeMinerData('m1', MinerStatuses.SLEEPING) }
        const connected = [makeDevice('m1')]
        const { devices } = resolveAssignPoolDevices(
          new Set([makeSocketItem('1', '1')]),
          hashmap,
          connected,
        )
        expect(devices).toHaveLength(0)
      })

      it('excludes miner with ERROR status', () => {
        const hashmap = { '1_1': makeMinerData('m1', MinerStatuses.ERROR) }
        const connected = [makeDevice('m1')]
        const { devices } = resolveAssignPoolDevices(
          new Set([makeSocketItem('1', '1')]),
          hashmap,
          connected,
        )
        expect(devices).toHaveLength(0)
      })
    })

    describe('hasEligibleDevices', () => {
      it('is true when at least one eligible device is found', () => {
        const hashmap = { '1_1': makeMinerData('m1', MinerStatuses.MINING) }
        const connected = [makeDevice('m1')]
        const { hasEligibleDevices } = resolveAssignPoolDevices(
          new Set([makeSocketItem('1', '1')]),
          hashmap,
          connected,
        )
        expect(hasEligibleDevices).toBe(true)
      })

      it('is false when all miners are ineligible', () => {
        const hashmap = { '1_1': makeMinerData('m1', MinerStatuses.OFFLINE) }
        const connected = [makeDevice('m1')]
        const { hasEligibleDevices } = resolveAssignPoolDevices(
          new Set([makeSocketItem('1', '1')]),
          hashmap,
          connected,
        )
        expect(hasEligibleDevices).toBe(false)
      })
    })

    describe('edge cases', () => {
      it('skips socket keys not found in minersHashmap', () => {
        const { devices } = resolveAssignPoolDevices(new Set([makeSocketItem('9', '9')]), {}, [
          makeDevice('m1'),
        ])
        expect(devices).toHaveLength(0)
      })

      it('skips miner entries with no id', () => {
        const hashmap = { '1_1': makeMinerData('', MinerStatuses.MINING) }
        const { devices } = resolveAssignPoolDevices(new Set([makeSocketItem('1', '1')]), hashmap, [
          makeDevice('m1'),
        ])
        expect(devices).toHaveLength(0)
      })

      it('skips when connectedMiners is undefined', () => {
        const hashmap = { '1_1': makeMinerData('m1', MinerStatuses.MINING) }
        const { devices } = resolveAssignPoolDevices(
          new Set([makeSocketItem('1', '1')]),
          hashmap,
          undefined,
        )
        expect(devices).toHaveLength(0)
      })

      it('skips eligible miner not found in connectedMiners list', () => {
        const hashmap = { '1_1': makeMinerData('m1', MinerStatuses.MINING) }
        const { devices } = resolveAssignPoolDevices(new Set([makeSocketItem('1', '1')]), hashmap, [
          makeDevice('m2'),
        ])
        expect(devices).toHaveLength(0)
      })

      it('handles multiple selected sockets and returns all eligible devices', () => {
        const hashmap = {
          '1_1': makeMinerData('m1', MinerStatuses.MINING),
          '1_2': makeMinerData('m2', MinerStatuses.NOT_MINING),
          '1_3': makeMinerData('m3', MinerStatuses.OFFLINE),
        }
        const connected = [makeDevice('m1'), makeDevice('m2'), makeDevice('m3')]
        const { devices } = resolveAssignPoolDevices(
          new Set([makeSocketItem('1', '1'), makeSocketItem('1', '2'), makeSocketItem('1', '3')]),
          hashmap,
          connected,
        )
        expect(devices).toHaveLength(2)
        expect(devices.map((d) => d.id)).toEqual(['m1', 'm2'])
      })
    })
  })

  describe('getSelectableName', () => {
    it('returns a JSON string with pduIndex and socketIndex', () => {
      expect(getSelectableName('1', '2')).toBe(JSON.stringify({ pduIndex: '1', socketIndex: '2' }))
    })
  })
})
