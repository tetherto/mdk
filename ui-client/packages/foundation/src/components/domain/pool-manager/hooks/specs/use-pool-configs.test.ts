import { describe, expect, it, vi } from 'vitest'
import { usePoolConfigs } from '../use-pool-configs'

vi.mock('../../pool-manager-constants', () => ({
  POOL_ENDPOINT_INDEX_ROLES: {
    0: 'primary',
    1: 'secondary',
    2: 'tertiary',
  },
}))

const makePoolConfig = (
  overrides: Partial<{
    id: string
    poolConfigName: string
    description: string
    miners: number
    containers: number
    updatedAt: string | number
    poolUrls: Array<{ url: string; pool: string; workerName?: string; workerPassword?: string }>
  }> = {},
) => ({
  id: 'pool-1',
  poolConfigName: 'Main Pool',
  description: 'Primary mining pool',
  miners: 10,
  containers: 3,
  updatedAt: '2024-01-01T00:00:00.000Z',
  poolUrls: [
    {
      url: 'stratum+tcp://pool.example.com:3333',
      pool: 'example-pool',
      workerName: 'worker1',
      workerPassword: 'x',
    },
  ],
  ...overrides,
})

describe('usePoolConfigs', () => {
  describe('return shape', () => {
    it('returns pools array', () => {
      const { pools } = usePoolConfigs({ data: [makePoolConfig()] })
      expect(Array.isArray(pools)).toBe(true)
    })

    it('returns poolIdMap record', () => {
      const { poolIdMap } = usePoolConfigs({ data: [makePoolConfig()] })
      expect(typeof poolIdMap).toBe('object')
    })

    it('returns isLoading', () => {
      const { isLoading } = usePoolConfigs({ data: [], isLoading: true })
      expect(isLoading).toBe(true)
    })

    it('defaults isLoading to false', () => {
      const { isLoading } = usePoolConfigs({ data: [] })
      expect(isLoading).toBe(false)
    })

    it('returns error as-is', () => {
      const err = new Error('fetch failed')
      const { error } = usePoolConfigs({ data: [], error: err })
      expect(error).toBe(err)
    })

    it('returns empty pools and poolIdMap when data is undefined', () => {
      const { pools, poolIdMap } = usePoolConfigs({})
      expect(pools).toHaveLength(0)
      expect(poolIdMap).toEqual({})
    })

    it('returns empty pools when data is empty array', () => {
      const { pools } = usePoolConfigs({ data: [] })
      expect(pools).toHaveLength(0)
    })
  })

  describe('pool mapping', () => {
    it('maps id from poolConfigData', () => {
      const { pools } = usePoolConfigs({ data: [makePoolConfig({ id: 'abc-123' })] })
      expect(pools[0].id).toBe('abc-123')
    })

    it('maps name from poolConfigName', () => {
      const { pools } = usePoolConfigs({ data: [makePoolConfig({ poolConfigName: 'My Pool' })] })
      expect(pools[0].name).toBe('My Pool')
    })

    it('maps description', () => {
      const { pools } = usePoolConfigs({ data: [makePoolConfig({ description: 'Fast pool' })] })
      expect(pools[0].description).toBe('Fast pool')
    })

    it('maps miners', () => {
      const { pools } = usePoolConfigs({ data: [makePoolConfig({ miners: 42 })] })
      expect(pools[0].miners).toBe(42)
    })

    it('maps containers to units', () => {
      const { pools } = usePoolConfigs({ data: [makePoolConfig({ containers: 7 })] })
      expect(pools[0].units).toBe(7)
    })

    it('maps workerName from first poolUrl', () => {
      const { pools } = usePoolConfigs({
        data: [
          makePoolConfig({
            poolUrls: [
              {
                url: 'stratum+tcp://a.com:3333',
                pool: 'p',
                workerName: 'wkr',
                workerPassword: 'x',
              },
            ],
          }),
        ],
      })
      expect(pools[0].workerName).toBe('wkr')
    })

    it('maps workerPassword from first poolUrl', () => {
      const { pools } = usePoolConfigs({
        data: [
          makePoolConfig({
            poolUrls: [
              {
                url: 'stratum+tcp://a.com:3333',
                pool: 'p',
                workerName: 'w',
                workerPassword: 'secret',
              },
            ],
          }),
        ],
      })
      expect(pools[0].workerPassword).toBe('secret')
    })

    it('workerName is undefined when not present on first poolUrl', () => {
      const { pools } = usePoolConfigs({
        data: [makePoolConfig({ poolUrls: [{ url: 'stratum+tcp://a.com:3333', pool: 'p' }] })],
      })
      expect(pools[0].workerName).toBeUndefined()
    })

    it('converts updatedAt string to Date', () => {
      const ts = '2024-06-15T12:00:00.000Z'
      const { pools } = usePoolConfigs({ data: [makePoolConfig({ updatedAt: ts })] })
      expect(pools[0].updatedAt).toBeInstanceOf(Date)
      expect(pools[0].updatedAt.toISOString()).toBe(ts)
    })

    it('converts updatedAt numeric timestamp to Date', () => {
      const ts = 1_700_000_000_000
      const { pools } = usePoolConfigs({ data: [makePoolConfig({ updatedAt: ts })] })
      expect(pools[0].updatedAt).toBeInstanceOf(Date)
      expect(pools[0].updatedAt.getTime()).toBe(ts)
    })

    it('maps multiple pool configs correctly', () => {
      const { pools } = usePoolConfigs({
        data: [
          makePoolConfig({ id: 'p1', poolConfigName: 'Pool One' }),
          makePoolConfig({ id: 'p2', poolConfigName: 'Pool Two' }),
        ],
      })
      expect(pools).toHaveLength(2)
      expect(pools[0].name).toBe('Pool One')
      expect(pools[1].name).toBe('Pool Two')
    })
  })

  describe('poolIdMap', () => {
    it('indexes pools by id', () => {
      const { poolIdMap } = usePoolConfigs({ data: [makePoolConfig({ id: 'pool-42' })] })
      expect(poolIdMap['pool-42']).toBeDefined()
    })

    it('poolIdMap entry matches the pool object', () => {
      const { pools, poolIdMap } = usePoolConfigs({ data: [makePoolConfig({ id: 'pool-1' })] })
      expect(poolIdMap['pool-1']).toBe(pools[0])
    })

    it('contains an entry for each pool', () => {
      const { poolIdMap } = usePoolConfigs({
        data: [
          makePoolConfig({ id: 'a' }),
          makePoolConfig({ id: 'b' }),
          makePoolConfig({ id: 'c' }),
        ],
      })
      expect(Object.keys(poolIdMap)).toHaveLength(3)
    })
  })

  describe('parseEndpoints', () => {
    it('parses hostname from valid URL', () => {
      const { pools } = usePoolConfigs({
        data: [
          makePoolConfig({ poolUrls: [{ url: 'stratum+tcp://pool.example.com:3333', pool: 'p' }] }),
        ],
      })
      expect(pools[0].endpoints[0].host).toBe('pool.example.com')
    })

    it('parses port from valid URL', () => {
      const { pools } = usePoolConfigs({
        data: [
          makePoolConfig({ poolUrls: [{ url: 'stratum+tcp://pool.example.com:3333', pool: 'p' }] }),
        ],
      })
      expect(pools[0].endpoints[0].port).toBe('3333')
    })

    it('defaults port to "80" when URL has no port', () => {
      const { pools } = usePoolConfigs({
        data: [makePoolConfig({ poolUrls: [{ url: 'http://pool.example.com', pool: 'p' }] })],
      })
      expect(pools[0].endpoints[0].port).toBe('80')
    })

    it('preserves original url string', () => {
      const rawUrl = 'stratum+tcp://pool.example.com:3333'
      const { pools } = usePoolConfigs({
        data: [makePoolConfig({ poolUrls: [{ url: rawUrl, pool: 'p' }] })],
      })
      expect(pools[0].endpoints[0].url).toBe(rawUrl)
    })

    it('preserves pool name', () => {
      const { pools } = usePoolConfigs({
        data: [
          makePoolConfig({ poolUrls: [{ url: 'stratum+tcp://a.com:3333', pool: 'my-pool' }] }),
        ],
      })
      expect(pools[0].endpoints[0].pool).toBe('my-pool')
    })

    it('assigns role from POOL_ENDPOINT_INDEX_ROLES by index', () => {
      const { pools } = usePoolConfigs({
        data: [
          makePoolConfig({
            poolUrls: [
              { url: 'stratum+tcp://a.com:3333', pool: 'p1' },
              { url: 'stratum+tcp://b.com:3333', pool: 'p2' },
              { url: 'stratum+tcp://c.com:3333', pool: 'p3' },
            ],
          }),
        ],
      })
      expect(pools[0].endpoints[0].role).toBe('primary')
      expect(pools[0].endpoints[1].role).toBe('secondary')
      expect(pools[0].endpoints[2].role).toBe('tertiary')
    })

    it('returns empty host and port for invalid URL', () => {
      const { pools } = usePoolConfigs({
        data: [makePoolConfig({ poolUrls: [{ url: 'not-a-valid-url', pool: 'p' }] })],
      })
      expect(pools[0].endpoints[0].host).toBe('')
      expect(pools[0].endpoints[0].port).toBe('')
    })

    it('preserves raw url string for invalid URL', () => {
      const { pools } = usePoolConfigs({
        data: [makePoolConfig({ poolUrls: [{ url: 'not-a-valid-url', pool: 'p' }] })],
      })
      expect(pools[0].endpoints[0].url).toBe('not-a-valid-url')
    })

    it('preserves pool name for invalid URL', () => {
      const { pools } = usePoolConfigs({
        data: [makePoolConfig({ poolUrls: [{ url: 'not-a-valid-url', pool: 'fallback-pool' }] })],
      })
      expect(pools[0].endpoints[0].pool).toBe('fallback-pool')
    })

    it('produces one endpoint per poolUrl entry', () => {
      const { pools } = usePoolConfigs({
        data: [
          makePoolConfig({
            poolUrls: [
              { url: 'stratum+tcp://a.com:3333', pool: 'p1' },
              { url: 'stratum+tcp://b.com:4444', pool: 'p2' },
            ],
          }),
        ],
      })
      expect(pools[0].endpoints).toHaveLength(2)
    })
  })
})
