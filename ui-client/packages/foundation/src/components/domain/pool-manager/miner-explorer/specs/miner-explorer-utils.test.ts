import { describe, expect, it, vi } from 'vitest'

import type { Device } from '../../../../../types'
import { mapDeviceToMinerRecord } from '../miner-explorer-utils'

vi.mock('../../../../../utils/device-utils', () => ({
  getMinerShortCode: vi.fn((code: string | undefined, tags: string[]) => {
    if (code) return code
    const codeTag = tags.find((t) => t.startsWith('code-'))
    return codeTag ? codeTag.replace('code-', '') : 'N/A'
  }),
}))

const POOL_ID_MAP = {
  'pool-1': { name: 'Primary Pool' },
  'pool-2': { name: 'Failover Pool' },
}

const makeDevice = (overrides: Partial<Device> = {}): Device =>
  ({
    id: 'device-abc',
    code: 'M001',
    tags: ['t-miner', 'code-M001'],
    info: {
      container: 'unit-01',
      poolConfig: 'pool-1',
    },
    last: {
      ts: 1_700_000_000_000,
      snap: {
        stats: {
          status: 'mining',
          hashrate_mhs: { t_5m: 100 },
        },
      },
    },
    ...overrides,
  }) as unknown as Device

describe('mapDeviceToMinerRecord', () => {
  describe('id', () => {
    it('maps device.id to record.id', () => {
      const result = mapDeviceToMinerRecord(makeDevice({ id: 'device-abc' }), POOL_ID_MAP)
      expect(result.id).toBe('device-abc')
    })

    it('returns empty string when device.id is undefined', () => {
      const result = mapDeviceToMinerRecord(makeDevice({ id: undefined }), POOL_ID_MAP)
      expect(result.id).toBe('')
    })
  })

  describe('code', () => {
    it('passes device.code to getMinerShortCode', () => {
      const result = mapDeviceToMinerRecord(makeDevice({ code: 'M123' }), POOL_ID_MAP)
      expect(result.code).toBe('M123')
    })

    it('falls back to tag-based code when device.code is undefined', () => {
      const result = mapDeviceToMinerRecord(
        makeDevice({ code: undefined, tags: ['code-B99'] }),
        POOL_ID_MAP,
      )
      expect(result.code).toBe('B99')
    })

    it('returns N/A when no code or code tag exists', () => {
      const result = mapDeviceToMinerRecord(makeDevice({ code: undefined, tags: [] }), POOL_ID_MAP)
      expect(result.code).toBe('N/A')
    })
  })

  describe('status', () => {
    it('maps last.snap.stats.status', () => {
      const result = mapDeviceToMinerRecord(makeDevice(), POOL_ID_MAP)
      expect(result.status).toBe('mining')
    })
  })

  describe('unit', () => {
    it('maps info.container to unit', () => {
      const result = mapDeviceToMinerRecord(makeDevice(), POOL_ID_MAP)
      expect(result.unit).toBe('unit-01')
    })

    it('is undefined when info.container is missing', () => {
      const result = mapDeviceToMinerRecord(makeDevice({ info: {} as any }), POOL_ID_MAP)
      expect(result.unit).toBeUndefined()
    })
  })

  describe('hashrate', () => {
    it('maps last.snap.stats.hashrate_mhs.t_5m', () => {
      const result = mapDeviceToMinerRecord(makeDevice(), POOL_ID_MAP)
      expect(result.hashrate).toBe(100)
    })

    it('is undefined when hashrate_mhs is missing', () => {
      const result = mapDeviceToMinerRecord(
        makeDevice({
          last: { ts: 1, snap: { stats: { status: 'mining' } } } as any,
        }),
        POOL_ID_MAP,
      )
      expect(result.hashrate).toBeUndefined()
    })

    it('is undefined when t_5m is missing', () => {
      const result = mapDeviceToMinerRecord(
        makeDevice({
          last: {
            ts: 1,
            snap: { stats: { status: 'mining', hashrate_mhs: {} } },
          } as any,
        }),
        POOL_ID_MAP,
      )
      expect(result.hashrate).toBeUndefined()
    })
  })

  describe('lastSyncedAt', () => {
    it('converts numeric last.ts to Date', () => {
      const ts = 1_700_000_000_000
      const result = mapDeviceToMinerRecord(
        makeDevice({ last: { ts, snap: {} } as any }),
        POOL_ID_MAP,
      )
      expect(result.lastSyncedAt).toEqual(new Date(ts))
    })

    it('returns new Date(0) when last.ts is undefined', () => {
      const result = mapDeviceToMinerRecord(
        makeDevice({ last: { ts: undefined, snap: {} } as any }),
        POOL_ID_MAP,
      )
      expect(result.lastSyncedAt).toEqual(new Date(0))
    })

    it('returns new Date(0) when last is undefined', () => {
      const result = mapDeviceToMinerRecord(makeDevice({ last: undefined }), POOL_ID_MAP)
      expect(result.lastSyncedAt).toEqual(new Date(0))
    })

    it('returns new Date(0) when last.ts is not a number', () => {
      const result = mapDeviceToMinerRecord(
        makeDevice({ last: { ts: 'not-a-number' as any, snap: {} } as any }),
        POOL_ID_MAP,
      )
      expect(result.lastSyncedAt).toEqual(new Date(0))
    })
  })

  // ─── tags ─────────────────────────────────────────────────────────────────────

  describe('tags', () => {
    it('maps device.tags', () => {
      const result = mapDeviceToMinerRecord(
        makeDevice({ tags: ['t-miner', 'code-M001'] }),
        POOL_ID_MAP,
      )
      expect(result.tags).toEqual(['t-miner', 'code-M001'])
    })

    it('defaults to empty array when device.tags is undefined', () => {
      const result = mapDeviceToMinerRecord(makeDevice({ tags: undefined }), POOL_ID_MAP)
      expect(result.tags).toEqual([])
    })
  })

  // ─── pool ──────────────────────────────────────────────────────────────────────

  describe('pool', () => {
    it('resolves pool name from poolIdMap via info.poolConfig', () => {
      const result = mapDeviceToMinerRecord(makeDevice(), POOL_ID_MAP)
      expect(result.pool).toBe('Primary Pool')
    })

    it('resolves correct pool when multiple pools exist', () => {
      const result = mapDeviceToMinerRecord(
        makeDevice({ info: { container: 'unit-01', poolConfig: 'pool-2' } as any }),
        POOL_ID_MAP,
      )
      expect(result.pool).toBe('Failover Pool')
    })

    it('is undefined when info.poolConfig is missing', () => {
      const result = mapDeviceToMinerRecord(
        makeDevice({ info: { container: 'unit-01' } as any }),
        POOL_ID_MAP,
      )
      expect(result.pool).toBeUndefined()
    })

    it('is undefined when poolConfig is not found in poolIdMap', () => {
      const result = mapDeviceToMinerRecord(
        makeDevice({ info: { container: 'unit-01', poolConfig: 'pool-unknown' } as any }),
        POOL_ID_MAP,
      )
      expect(result.pool).toBeUndefined()
    })

    it('is undefined when poolIdMap is empty', () => {
      const result = mapDeviceToMinerRecord(makeDevice(), {})
      expect(result.pool).toBeUndefined()
    })
  })

  // ─── raw ───────────────────────────────────────────────────────────────────────

  describe('raw', () => {
    it('sets raw to the original device object', () => {
      const device = makeDevice()
      const result = mapDeviceToMinerRecord(device, POOL_ID_MAP)
      expect(result.raw).toBe(device)
    })
  })

  // ─── return shape ──────────────────────────────────────────────────────────────

  describe('return shape', () => {
    it('always returns all required MinerRecord keys', () => {
      const result = mapDeviceToMinerRecord(makeDevice(), POOL_ID_MAP)
      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('code')
      expect(result).toHaveProperty('lastSyncedAt')
      expect(result).toHaveProperty('tags')
      expect(result).toHaveProperty('raw')
    })

    it('lastSyncedAt is always a Date instance', () => {
      const result = mapDeviceToMinerRecord(makeDevice(), POOL_ID_MAP)
      expect(result.lastSyncedAt).toBeInstanceOf(Date)
    })

    it('produces a new object on each call', () => {
      const device = makeDevice()
      const a = mapDeviceToMinerRecord(device, POOL_ID_MAP)
      const b = mapDeviceToMinerRecord(device, POOL_ID_MAP)
      expect(a).not.toBe(b)
    })
  })
})
