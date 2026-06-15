import { UNITS } from '@core/index'
import { describe, expect, it, vi } from 'vitest'
import type { ContainerInfo, Device } from '@/types'
import { useSiteOverviewDetailsData } from '../use-site-overview-details-data'

vi.mock('@/utils/device-utils', () => ({
  getDeviceData: vi.fn((miner) => {
    if (!miner) return [undefined, undefined]
    return [
      undefined,
      {
        snap: {
          stats: {
            hashrate_mhs: { t_5m: 100 },
          },
        },
      },
    ]
  }),
  getHashrateUnit: vi.fn((value: number) => ({
    value: value > 0 ? String(value) : null,
    unit: UNITS.HASHRATE_MH_S,
    realValue: value,
  })),
}))

vi.mock('@/utils/status-utils', () => ({
  CONTAINER_STATUS: { RUNNING: 'running' },
}))

const makeMiner = (overrides: Partial<Device> = {}): Device =>
  ({
    id: 'miner-1',
    type: 'miner',
    info: { pos: '1_1', container: 'container-1' },
    last: {
      snap: {
        stats: { hashrate_mhs: { t_5m: 100 } },
      },
    },
    ...overrides,
  }) as unknown as Device

const makePdu = (
  overrides: Partial<{
    pdu: string
    power_w: number
    sockets: Array<{ socket: string | number; enabled: boolean }>
    offline: boolean
  }> = {},
) => ({
  pdu: '1',
  power_w: 1000,
  sockets: [
    { socket: 1, enabled: true },
    { socket: 2, enabled: true },
  ],
  ...overrides,
})

const makeUnit = (
  overrides: Partial<{
    type: string
    info: Record<string, unknown>
    last: Record<string, unknown>
  }> = {},
) => ({
  type: 'container-bd',
  info: { container: 'bd-01', nominalMinerCapacity: '120' },
  last: { snap: { stats: { status: 'running' } } },
  ...overrides,
})

describe('useSiteOverviewDetailsData', () => {
  describe('defaults', () => {
    it('returns empty pdus when no options provided', () => {
      const { pdus } = useSiteOverviewDetailsData(makeUnit())
      expect(pdus).toEqual([])
    })

    it('returns empty segregatedPduSections when no pdus', () => {
      const { segregatedPduSections } = useSiteOverviewDetailsData(makeUnit())
      expect(segregatedPduSections).toEqual({})
    })

    it('returns empty minersHashmap when no pdus or miners', () => {
      const { minersHashmap } = useSiteOverviewDetailsData(makeUnit())
      expect(minersHashmap).toEqual({})
    })

    it('defaults containerHashRate to "0 PH/s"', () => {
      const { containerHashRate } = useSiteOverviewDetailsData(makeUnit())
      expect(containerHashRate).toBe(`0 ${UNITS.HASHRATE_PH_S}`)
    })

    it('defaults actualMinersCount to 0', () => {
      const { actualMinersCount } = useSiteOverviewDetailsData(makeUnit())
      expect(actualMinersCount).toBe(0)
    })

    it('defaults isLoading to false', () => {
      const { isLoading } = useSiteOverviewDetailsData(makeUnit())
      expect(isLoading).toBe(false)
    })

    it('returns connectedMiners as undefined when empty array passed', () => {
      const { connectedMiners } = useSiteOverviewDetailsData(makeUnit(), { connectedMiners: [] })
      expect(connectedMiners).toBeUndefined()
    })

    it('works when unit is undefined', () => {
      const result = useSiteOverviewDetailsData(undefined)
      expect(result.pdus).toEqual([])
      expect(result.isLoading).toBe(false)
      expect(result.isContainerRunning).toBe(false)
    })
  })

  describe('options passthrough', () => {
    it('passes through containerHashRate', () => {
      const { containerHashRate } = useSiteOverviewDetailsData(makeUnit(), {
        containerHashRate: `1.5 ${UNITS.HASHRATE_PH_S}`,
      })
      expect(containerHashRate).toBe(`1.5 ${UNITS.HASHRATE_PH_S}`)
    })

    it('passes through actualMinersCount', () => {
      const { actualMinersCount } = useSiteOverviewDetailsData(makeUnit(), {
        actualMinersCount: 42,
      })
      expect(actualMinersCount).toBe(42)
    })

    it('passes through isLoading true', () => {
      const { isLoading } = useSiteOverviewDetailsData(makeUnit(), { isLoading: true })
      expect(isLoading).toBe(true)
    })

    it('passes through connectedMinersData', () => {
      const data = [{ raw: true }] as unknown as ContainerInfo[]
      const { connectedMinersData } = useSiteOverviewDetailsData(makeUnit(), {
        connectedMinersData: data,
      })
      expect(connectedMinersData).toBe(data)
    })

    it('passes through pdus', () => {
      const pdus = [makePdu()]
      const { pdus: result } = useSiteOverviewDetailsData(makeUnit(), { pdus })
      expect(result).toBe(pdus)
    })

    it('returns connectedMiners array when miners are passed', () => {
      const miners = [makeMiner()]
      const { connectedMiners } = useSiteOverviewDetailsData(makeUnit(), {
        connectedMiners: miners,
      })
      expect(connectedMiners).toEqual(miners)
    })
  })

  describe('isContainerRunning', () => {
    it('is true when status is "running"', () => {
      const { isContainerRunning } = useSiteOverviewDetailsData(
        makeUnit({ last: { snap: { stats: { status: 'running' } } } }),
      )
      expect(isContainerRunning).toBe(true)
    })

    it('is false when status is "offline"', () => {
      const { isContainerRunning } = useSiteOverviewDetailsData(
        makeUnit({ last: { snap: { stats: { status: 'offline' } } } }),
      )
      expect(isContainerRunning).toBe(false)
    })

    it('is false when status is absent', () => {
      const { isContainerRunning } = useSiteOverviewDetailsData(
        makeUnit({ last: { snap: { stats: {} } } }),
      )
      expect(isContainerRunning).toBe(false)
    })

    it('is false when last is absent', () => {
      const { isContainerRunning } = useSiteOverviewDetailsData(makeUnit({ last: undefined }))
      expect(isContainerRunning).toBe(false)
    })
  })

  describe('containerInfo', () => {
    it('includes type from unit', () => {
      const { containerInfo } = useSiteOverviewDetailsData(makeUnit({ type: 'container-mbt' }))
      expect(containerInfo.type).toBe('container-mbt')
    })

    it('includes info fields from unit', () => {
      const { containerInfo } = useSiteOverviewDetailsData(
        makeUnit({ info: { container: 'mbt-01', nominalMinerCapacity: '80' } }),
      )
      expect(containerInfo.container).toBe('mbt-01')
      expect(containerInfo.nominalMinerCapacity).toBe('80')
    })

    it('is empty object when unit has no info', () => {
      const { containerInfo } = useSiteOverviewDetailsData(makeUnit({ info: undefined }))
      expect(containerInfo).toEqual({ container: '', type: 'container-bd' })
    })
  })

  describe('segregatedPduSections', () => {
    it('groups PDUs with underscore-prefixed names by prefix', () => {
      const pdus = [makePdu({ pdu: 'rack1_pdu1' }), makePdu({ pdu: 'rack1_pdu2' })]
      const { segregatedPduSections } = useSiteOverviewDetailsData(makeUnit(), { pdus })
      expect(segregatedPduSections.rack1).toHaveLength(2)
    })

    it('groups PDUs without underscore into "Racks"', () => {
      const pdus = [makePdu({ pdu: 'pdu1' }), makePdu({ pdu: 'pdu2' })]
      const { segregatedPduSections } = useSiteOverviewDetailsData(makeUnit(), { pdus })
      expect(segregatedPduSections.Racks).toHaveLength(2)
    })

    it('handles mixed PDU name formats', () => {
      const pdus = [makePdu({ pdu: 'rack1_pdu1' }), makePdu({ pdu: 'standalone' })]
      const { segregatedPduSections } = useSiteOverviewDetailsData(makeUnit(), { pdus })
      expect(segregatedPduSections.rack1).toHaveLength(1)
      expect(segregatedPduSections.Racks).toHaveLength(1)
    })

    it('skips PDUs with no pdu string', () => {
      const pdus = [makePdu({ pdu: '' })]
      const { segregatedPduSections } = useSiteOverviewDetailsData(makeUnit(), { pdus })
      expect(Object.keys(segregatedPduSections)).toHaveLength(0)
    })

    it('separates two different rack prefixes into separate groups', () => {
      const pdus = [makePdu({ pdu: 'rackA_1' }), makePdu({ pdu: 'rackB_1' })]
      const { segregatedPduSections } = useSiteOverviewDetailsData(makeUnit(), { pdus })
      expect(Object.keys(segregatedPduSections)).toHaveLength(2)
      expect(segregatedPduSections.rackA).toHaveLength(1)
      expect(segregatedPduSections.rackB).toHaveLength(1)
    })
  })

  describe('minersHashmap', () => {
    it('creates a key per socket in format pduIndex_socketIndex', () => {
      const pdus = [makePdu({ pdu: '1', sockets: [{ socket: 1, enabled: true }] })]
      const { minersHashmap } = useSiteOverviewDetailsData(makeUnit(), { pdus })
      expect(minersHashmap['1_1']).toBeDefined()
    })

    it('creates keys for all sockets across all PDUs', () => {
      const pdus = [
        makePdu({
          pdu: '1',
          sockets: [
            { socket: 1, enabled: true },
            { socket: 2, enabled: true },
          ],
        }),
        makePdu({ pdu: '2', sockets: [{ socket: 1, enabled: true }] }),
      ]
      const { minersHashmap } = useSiteOverviewDetailsData(makeUnit(), { pdus })
      expect(Object.keys(minersHashmap)).toHaveLength(3)
      expect(minersHashmap['1_1']).toBeDefined()
      expect(minersHashmap['1_2']).toBeDefined()
      expect(minersHashmap['2_1']).toBeDefined()
    })

    it('assigns type from unit to each miner entry', () => {
      const pdus = [makePdu({ pdu: '1', sockets: [{ socket: 1, enabled: true }] })]
      const { minersHashmap } = useSiteOverviewDetailsData(makeUnit({ type: 'container-mbt' }), {
        pdus,
      })
      expect(minersHashmap['1_1'].type).toBe('container-mbt')
    })

    it('assigns miner id when connected miner matches socket', () => {
      const pdus = [makePdu({ pdu: '1', sockets: [{ socket: 1, enabled: true }] })]
      const miner = makeMiner({ id: 'miner-abc', info: { pos: '1_1' } as never })
      const { minersHashmap } = useSiteOverviewDetailsData(makeUnit(), {
        pdus,
        connectedMiners: [miner],
      })
      expect(minersHashmap['1_1'].id).toBe('miner-abc')
    })

    it('assigns empty id when no connected miner matches socket', () => {
      const pdus = [makePdu({ pdu: '1', sockets: [{ socket: 1, enabled: true }] })]
      const { minersHashmap } = useSiteOverviewDetailsData(makeUnit(), { pdus })
      expect(minersHashmap['1_1'].id).toBe('')
    })

    it('skips sockets with undefined socketIndex', () => {
      const pdus = [makePdu({ pdu: '1', sockets: [{ socket: undefined as never, enabled: true }] })]
      const { minersHashmap } = useSiteOverviewDetailsData(makeUnit(), { pdus })
      expect(Object.keys(minersHashmap)).toHaveLength(0)
    })

    it('skips PDUs with empty pdu string', () => {
      const pdus = [makePdu({ pdu: '', sockets: [{ socket: 1, enabled: true }] })]
      const { minersHashmap } = useSiteOverviewDetailsData(makeUnit(), { pdus })
      expect(Object.keys(minersHashmap)).toHaveLength(0)
    })
  })
})
