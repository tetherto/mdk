import { CONTAINER_STATUS, SITE_OVERVIEW_STATUSES } from '@tetherto/mdk-ui-foundation'
import { describe, expect, it } from 'vitest'

import { useSitesOverviewData } from '../use-sites-overview-data'

describe('useSitesOverviewData', () => {
  const mockUnits = [
    {
      id: 'unit-1',
      info: { container: 'cont-alpha' },
      last: { snap: { stats: { status: CONTAINER_STATUS.RUNNING } } },
    },
    {
      id: 'unit-2',
      info: { container: 'cont-beta' },
      last: { snap: { stats: { status: 'stopped' } } },
    },
  ]

  const mockPoolStats = [{ container: 'cont-alpha', overriddenConfig: 2 }]

  const mockTailLogItem = {
    hashrate_mhs_1m_group_sum_aggr: {
      'cont-alpha': 5_000_000,
      'cont-beta': 0,
    },
  }

  it('passes through the isLoading state', () => {
    const { isLoading } = useSitesOverviewData({
      units: [],
      poolStats: [],
      isLoading: true,
      tailLogItem: {},
    })
    expect(isLoading).toBe(true)
  })

  it('maps raw units into the processed shape with per-container hashrate in MH/s', () => {
    const { units } = useSitesOverviewData({
      units: mockUnits,
      poolStats: mockPoolStats,
      isLoading: false,
      tailLogItem: mockTailLogItem,
    })

    expect(units).toHaveLength(2)

    expect(units[0]!.id).toBe('unit-1')
    expect(units[0]!.status).toBe(SITE_OVERVIEW_STATUSES.MINING)
    expect(units[0]!.hashrateMhs).toBe(5_000_000)
    expect(units[0]!.poolStats).toEqual(mockPoolStats[0])

    expect(units[1]!.id).toBe('unit-2')
    expect(units[1]!.status).toBe(SITE_OVERVIEW_STATUSES.OFFLINE)
    expect(units[1]!.hashrateMhs).toBe(0)
    expect(units[1]!.poolStats).toBeUndefined()
  })

  it('defaults hashrateMhs to 0 when the container is missing from the tail log', () => {
    const unitWithNoLog = [{ id: 'unit-3', info: { container: 'cont-gamma' } }]

    const { units } = useSitesOverviewData({
      units: unitWithNoLog,
      poolStats: [],
      isLoading: false,
      tailLogItem: { hashrate_mhs_1m_group_sum_aggr: {} },
    })

    expect(units[0]!.hashrateMhs).toBe(0)
  })

  it('maps status to OFFLINE when the container snapshot is missing', () => {
    const brokenUnit = [{ id: 'unit-4', info: { container: 'cont-delta' }, last: {} }]

    const { units } = useSitesOverviewData({
      units: brokenUnit,
      poolStats: [],
      isLoading: false,
      tailLogItem: {},
    })

    expect(units[0]!.status).toBe(SITE_OVERVIEW_STATUSES.OFFLINE)
  })

  it('skips pool-stats entries that are missing a container key', () => {
    const { units } = useSitesOverviewData({
      units: [{ id: 'u', info: { container: 'C-1' } }],
      poolStats: [{ overriddenConfig: 99 } as never, { container: 'C-1', overriddenConfig: 7 }],
      isLoading: false,
      tailLogItem: {},
    })
    expect(units[0]!.poolStats?.overriddenConfig).toBe(7)
  })

  it('returns undefined poolStats when the unit has no container id', () => {
    const { units } = useSitesOverviewData({
      units: [{ id: 'u', info: {} }],
      poolStats: [{ container: 'C-1', overriddenConfig: 7 }],
      isLoading: false,
      tailLogItem: {},
    })
    expect(units[0]!.poolStats).toBeUndefined()
  })

  it('associates pool stats correctly using container id as key', () => {
    const specificUnits = [{ info: { container: 'C-1' } }, { info: { container: 'C-2' } }]
    const specificStats = [
      { container: 'C-2', overriddenConfig: 10 },
      { container: 'C-1', overriddenConfig: 5 },
    ]

    const { units } = useSitesOverviewData({
      units: specificUnits,
      poolStats: specificStats,
      isLoading: false,
      tailLogItem: {},
    })

    expect(units.find((u) => u.info?.container === 'C-1')?.poolStats?.overriddenConfig).toBe(5)
    expect(units.find((u) => u.info?.container === 'C-2')?.poolStats?.overriddenConfig).toBe(10)
  })
})
