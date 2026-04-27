import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CONTAINER_LIST_THINGS_LIMIT,
  getByIdsQuery,
  getByTagsQuery,
  getByTagsWithAlertsQuery,
  getByTagsWithCriticalAlertsQuery,
  getByThingsAttributeQuery,
  getByTypesQuery,
  getContainerByContainerTagsQuery,
  getContainerMinersByContainerTagsQuery,
  getDeviceByAlertId,
  getFiltersQuery,
  getListQuery,
  getLvCabinetDevicesByRoot,
  getMinersByContainerTagsQuery,
  getSitePowerMeterQuery,
} from '../query-utils'

vi.mock('../constants/container-constants', () => ({
  MAINTENANCE_CONTAINER: 'maintenance',
  NO_MAINTENANCE_CONTAINER: 'no-maintenance',
}))

describe('query-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('CONTAINER_LIST_THINGS_LIMIT', () => {
    it('exports correct limit value', () => {
      expect(CONTAINER_LIST_THINGS_LIMIT).toBe(1000)
    })
  })

  describe('getByTagsQuery', () => {
    it('returns {} when filterTags is empty and allowEmptyArray is false', () => {
      expect(getByTagsQuery([])).toBe('{}')
    })

    it('returns {} when filterTags is empty and allowEmptyArray is undefined', () => {
      expect(getByTagsQuery([], undefined)).toBe('{}')
    })

    it('returns query when filterTags is empty and allowEmptyArray is true', () => {
      const result = JSON.parse(getByTagsQuery([], true))
      expect(result).toEqual({ tags: { $in: [] } })
    })

    it('returns query with tags when filterTags has values', () => {
      const result = JSON.parse(getByTagsQuery(['tag-1', 'tag-2']))
      expect(result).toEqual({ tags: { $in: ['tag-1', 'tag-2'] } })
    })

    it('returns valid JSON string', () => {
      expect(() => JSON.parse(getByTagsQuery(['tag-1']))).not.toThrow()
    })
  })

  describe('getByTagsWithAlertsQuery', () => {
    it('returns base query when filterTags is empty', () => {
      const result = JSON.parse(getByTagsWithAlertsQuery([]))
      expect(result).toEqual({ 'last.alerts': { $ne: null } })
    })

    it('returns $or query when filterTags has values', () => {
      const result = JSON.parse(getByTagsWithAlertsQuery(['tag-1']))
      expect(result).toHaveProperty('$or')
      expect(result.$or).toBeInstanceOf(Array)
    })

    it('includes base alerts query in $or', () => {
      const result = JSON.parse(getByTagsWithAlertsQuery(['tag-1']))
      expect(result.$or[0]).toEqual({ 'last.alerts': { $ne: null } })
    })

    it('includes last.alerts.name $in query in $or', () => {
      const result = JSON.parse(getByTagsWithAlertsQuery(['tag-1']))
      expect(result.$or[1]).toEqual({ 'last.alerts.name': { $in: ['tag-1'] } })
    })

    it('returns $or query when allowEmptyArray is true even with empty tags', () => {
      const result = JSON.parse(getByTagsWithAlertsQuery([], true))
      expect(result).toHaveProperty('$or')
    })

    it('returns valid JSON string', () => {
      expect(() => JSON.parse(getByTagsWithAlertsQuery(['tag-1']))).not.toThrow()
    })
  })

  describe('getByTagsWithCriticalAlertsQuery', () => {
    it('returns critical alerts only query when filterTags is empty', () => {
      const result = JSON.parse(getByTagsWithCriticalAlertsQuery([]))
      expect(result).toEqual({
        'last.alerts': { $elemMatch: { severity: 'critical' } },
      })
    })

    it('returns combined query with tags when filterTags has values', () => {
      const result = JSON.parse(getByTagsWithCriticalAlertsQuery(['tag-1', 'tag-2']))
      expect(result).toEqual({
        tags: { $in: ['tag-1', 'tag-2'] },
        'last.alerts': { $elemMatch: { severity: 'critical' } },
      })
    })

    it('returns critical only query when allowEmptyArray is false and tags are empty', () => {
      const result = JSON.parse(getByTagsWithCriticalAlertsQuery([], false))
      expect(result).toEqual({
        'last.alerts': { $elemMatch: { severity: 'critical' } },
      })
    })

    it('returns combined query when allowEmptyArray is true and tags are empty', () => {
      const result = JSON.parse(getByTagsWithCriticalAlertsQuery([], true))
      expect(result).toHaveProperty('tags')
      expect(result).toHaveProperty('last.alerts')
    })

    it('returns valid JSON string', () => {
      expect(() => JSON.parse(getByTagsWithCriticalAlertsQuery(['tag-1']))).not.toThrow()
    })
  })

  describe('getByTypesQuery', () => {
    it('returns {} when filterTypes is empty', () => {
      expect(getByTypesQuery([])).toBe('{}')
    })

    it('returns query with types when filterTypes has values', () => {
      const result = JSON.parse(getByTypesQuery(['t-miner', 't-container']))
      expect(result).toEqual({ type: { $in: ['t-miner', 't-container'] } })
    })

    it('returns query when allowEmptyArray is true with empty array', () => {
      const result = JSON.parse(getByTypesQuery([], true))
      expect(result).toEqual({ type: { $in: [] } })
    })

    it('returns valid JSON string', () => {
      expect(() => JSON.parse(getByTypesQuery(['t-miner']))).not.toThrow()
    })
  })

  describe('getByIdsQuery', () => {
    it('returns {} when ids is empty', () => {
      expect(getByIdsQuery([])).toBe('{}')
    })

    it('returns query with ids when ids has values', () => {
      const result = JSON.parse(getByIdsQuery(['id-1', 'id-2']))
      expect(result).toEqual({ id: { $in: ['id-1', 'id-2'] } })
    })

    it('returns query when allowEmptyArray is true with empty array', () => {
      const result = JSON.parse(getByIdsQuery([], true))
      expect(result).toEqual({ id: { $in: [] } })
    })

    it('returns valid JSON string', () => {
      expect(() => JSON.parse(getByIdsQuery(['id-1']))).not.toThrow()
    })
  })

  describe('getContainerByContainerTagsQuery', () => {
    it('returns {} when filterTags is empty', () => {
      expect(getContainerByContainerTagsQuery([])).toBe('{}')
    })

    it('returns $and query with container type when filterTags has values', () => {
      const result = JSON.parse(getContainerByContainerTagsQuery(['tag-1']))
      expect(result).toEqual({
        $and: [{ tags: { $in: ['tag-1'] } }, { tags: { $in: ['t-container'] } }],
      })
    })

    it('returns query when allowEmptyArray is true with empty tags', () => {
      const result = JSON.parse(getContainerByContainerTagsQuery([], true))
      expect(result).toHaveProperty('$and')
    })

    it('returns valid JSON string', () => {
      expect(() => JSON.parse(getContainerByContainerTagsQuery(['tag-1']))).not.toThrow()
    })
  })

  describe('getMinersByContainerTagsQuery', () => {
    it('returns empty string when filterTags is empty', () => {
      expect(getMinersByContainerTagsQuery([])).toBe('')
    })

    it('returns $and query with miner type when filterTags has values', () => {
      const result = JSON.parse(getMinersByContainerTagsQuery(['tag-1']))
      expect(result).toEqual({
        $and: [{ tags: { $in: ['tag-1'] } }, { tags: { $in: ['t-miner'] } }],
      })
    })

    it('returns query when allowEmptyArray is true with empty tags', () => {
      const result = JSON.parse(getMinersByContainerTagsQuery([], true))
      expect(result).toHaveProperty('$and')
    })
  })

  describe('getSitePowerMeterQuery', () => {
    it('returns correct query', () => {
      const result = JSON.parse(getSitePowerMeterQuery())
      expect(result).toEqual({
        $and: [{ 'info.pos': { $eq: 'site' } }, { tags: { $in: ['t-powermeter'] } }],
      })
    })

    it('returns valid JSON string', () => {
      expect(() => JSON.parse(getSitePowerMeterQuery())).not.toThrow()
    })
  })

  describe('getLvCabinetDevicesByRoot', () => {
    it('returns correct query with root', () => {
      const result = JSON.parse(getLvCabinetDevicesByRoot('lv-cabinet-1'))
      expect(result).toEqual({
        $and: [
          { 'info.pos': { $regex: 'lv-cabinet-1' } },
          { tags: { $in: ['t-powermeter', 't-sensor-temp'] } },
        ],
      })
    })

    it('includes the root in regex', () => {
      const result = JSON.parse(getLvCabinetDevicesByRoot('my-root'))
      expect(result.$and[0]['info.pos'].$regex).toBe('my-root')
    })

    it('returns valid JSON string', () => {
      expect(() => JSON.parse(getLvCabinetDevicesByRoot('root'))).not.toThrow()
    })
  })

  describe('getDeviceByAlertId', () => {
    it('returns correct query with uuid', () => {
      const result = JSON.parse(getDeviceByAlertId('alert-uuid-123'))
      expect(result).toEqual({
        'last.alerts': { $elemMatch: { uuid: 'alert-uuid-123' } },
      })
    })

    it('returns valid JSON string', () => {
      expect(() => JSON.parse(getDeviceByAlertId('some-uuid'))).not.toThrow()
    })
  })

  describe('getContainerMinersByContainerTagsQuery', () => {
    it('returns {} when filterTags is empty', () => {
      expect(getContainerMinersByContainerTagsQuery([])).toBe('{}')
    })

    it('returns $and query with miner type when filterTags has values', () => {
      const result = JSON.parse(getContainerMinersByContainerTagsQuery(['tag-1']))
      expect(result).toEqual({
        $and: [{ tags: { $in: ['tag-1'] } }, { tags: { $in: ['t-miner'] } }],
      })
    })

    it('returns query when allowEmptyArray is true with empty tags', () => {
      const result = JSON.parse(getContainerMinersByContainerTagsQuery([], true))
      expect(result).toHaveProperty('$and')
    })
  })

  describe('getByThingsAttributeQuery', () => {
    it('returns empty object when filterAttributes is empty', () => {
      expect(getByThingsAttributeQuery([], [])).toEqual({})
    })

    it('returns empty object when filterAttributes empty and allowEmptyArray false', () => {
      expect(getByThingsAttributeQuery([], [], false)).toEqual({})
    })

    it('returns $and query when allowEmptyArray true and filterAttributes empty', () => {
      const result = getByThingsAttributeQuery([], [], true)
      expect(result).toEqual({ $and: [] })
    })

    describe('last.alerts attribute', () => {
      it('returns $exists true when value is truthy', () => {
        const result = getByThingsAttributeQuery([{ attribute: 'last.alerts', values: [true] }], [])
        expect(result).toEqual({ $and: [{ 'last.alerts.0': { $exists: true } }] })
      })

      it('returns $exists false when value is false', () => {
        const result = getByThingsAttributeQuery(
          [{ attribute: 'last.alerts', values: [false] }],
          [],
        )
        expect(result).toEqual({ $and: [{ 'last.alerts.0': { $exists: false } }] })
      })

      it('returns empty object when value is undefined', () => {
        const result = getByThingsAttributeQuery([{ attribute: 'last.alerts', values: [] }], [])
        expect(result).toEqual({ $and: [{}] })
      })
    })

    describe('info.container attribute', () => {
      it('returns empty object when values has more than 1 item', () => {
        const result = getByThingsAttributeQuery(
          [{ attribute: 'info.container', values: ['container-1', 'container-2'] }],
          [],
        )
        expect(result).toEqual({ $and: [{}] })
      })

      it('returns $in query for other container values', () => {
        const result = getByThingsAttributeQuery(
          [{ attribute: 'info.container', values: ['container-1'] }],
          [],
        )
        expect(result).toEqual({
          $and: [{ 'info.container': { $in: ['container-1'] } }],
        })
      })
    })

    describe('info.macAddress attribute', () => {
      it('returns $or with regex queries for mac addresses', () => {
        const result = getByThingsAttributeQuery(
          [{ attribute: 'info.macAddress', values: ['AA:BB:CC:DD:EE:FF'] }],
          [],
        )
        expect(result).toEqual({
          $and: [
            {
              $or: [
                {
                  'info.macAddress': {
                    $regex: '^AA:BB:CC:DD:EE:FF$',
                    $options: 'i',
                  },
                },
              ],
            },
          ],
        })
      })

      it('handles multiple mac addresses', () => {
        const result = getByThingsAttributeQuery(
          [{ attribute: 'info.macAddress', values: ['AA:BB:CC', 'DD:EE:FF'] }],
          [],
        ) as { $and: Array<{ $or: unknown[] }> }
        expect(result.$and[0].$or).toHaveLength(2)
      })
    })

    describe('tags attribute', () => {
      it('returns $or query for t-miner selected type', () => {
        const result = getByThingsAttributeQuery(
          [{ attribute: 'tags', values: ['search-term'] }],
          ['t-miner'],
        )
        expect(result).toHaveProperty('$and')
        const andClause = (result as { $and: Array<{ $or: unknown[] }> }).$and[0]
        expect(andClause).toHaveProperty('$or')
      })

      it('returns $or query for t-container selected type', () => {
        const result = getByThingsAttributeQuery(
          [{ attribute: 'tags', values: ['search-term'] }],
          ['t-container'],
        )
        const andClause = (result as { $and: Array<{ $or: unknown[] }> }).$and[0]
        expect(andClause.$or.length).toBeGreaterThan(1)
      })

      it('returns $or query for t-inventory-miner_part selected type', () => {
        const result = getByThingsAttributeQuery(
          [{ attribute: 'tags', values: ['search-term'] }],
          ['t-inventory-miner_part'],
        )
        const andClause = (result as { $and: Array<{ $or: unknown[] }> }).$and[0]
        expect(andClause.$or.length).toBeGreaterThan(1)
      })

      it('includes tags $in query in $or', () => {
        const result = getByThingsAttributeQuery(
          [{ attribute: 'tags', values: ['search-term'] }],
          ['t-miner'],
        )
        const andClause = (result as { $and: Array<{ $or: unknown[] }> }).$and[0]
        const lastOrItem = andClause.$or[andClause.$or.length - 1] as Record<string, unknown>
        expect(lastOrItem).toHaveProperty('tags')
      })

      it('handles multiple search values', () => {
        const result = getByThingsAttributeQuery(
          [{ attribute: 'tags', values: ['term-1', 'term-2'] }],
          ['t-miner'],
        )
        expect(result).toHaveProperty('$and')
      })

      it('returns minimal $or with just tags for unknown selected types', () => {
        const result = getByThingsAttributeQuery(
          [{ attribute: 'tags', values: ['search-term'] }],
          ['t-unknown'],
        )
        const andClause = (result as { $and: Array<{ $or: unknown[] }> }).$and[0]
        expect(andClause.$or).toHaveLength(1)
      })
    })

    describe('generic attribute', () => {
      it('returns $in query for generic attribute', () => {
        const result = getByThingsAttributeQuery(
          [{ attribute: 'info.site', values: ['site-1', 'site-2'] }],
          [],
        )
        expect(result).toEqual({
          $and: [{ 'info.site': { $in: ['site-1', 'site-2'] } }],
        })
      })
    })

    describe('multiple attributes', () => {
      it('combines multiple attributes into $and', () => {
        const result = getByThingsAttributeQuery(
          [
            { attribute: 'info.site', values: ['site-1'] },
            { attribute: 'info.status', values: ['active'] },
          ],
          [],
        )
        expect((result as { $and: unknown[] }).$and).toHaveLength(2)
      })
    })
  })

  describe('getListQuery', () => {
    it('returns valid JSON string', () => {
      expect(() => JSON.parse(getListQuery([]))).not.toThrow()
    })

    it('includes $and with tags $in selectedTypes', () => {
      const result = JSON.parse(getListQuery([], undefined, ['t-container']))
      expect(result.$and[1]).toEqual({ tags: { $in: ['t-container'] } })
    })

    it('uses t-container as default selectedTypes', () => {
      const result = JSON.parse(getListQuery([]))
      expect(result.$and[1]).toEqual({ tags: { $in: ['t-container'] } })
    })

    it('processes ip- prefix tags', () => {
      const result = JSON.parse(getListQuery(['ip-192.168.1.1']))
      const attributeQuery = result.$and[0]
      expect(JSON.stringify(attributeQuery)).toContain('opts.address')
    })

    it('processes mac- prefix tags and lowercases values', () => {
      const result = JSON.parse(getListQuery(['mac-AA:BB:CC:DD:EE:FF']))
      const attributeQuery = result.$and[0]
      expect(JSON.stringify(attributeQuery)).toContain('info.macAddress')
      expect(JSON.stringify(attributeQuery)).toContain('aa:bb:cc:dd:ee:ff')
    })

    it('processes sn- prefix tags', () => {
      const result = JSON.parse(getListQuery(['sn-SN12345']))
      const attributeQuery = result.$and[0]
      expect(JSON.stringify(attributeQuery)).toContain('info.serialNum')
    })

    it('processes firmware- prefix tags', () => {
      const result = JSON.parse(getListQuery(['firmware-1.0.0']))
      const attributeQuery = result.$and[0]
      expect(JSON.stringify(attributeQuery)).toContain('last.snap.config.firmware_ver')
    })

    it('processes plain tags without prefix', () => {
      const result = JSON.parse(getListQuery(['my-tag']))
      const attributeQuery = result.$and[0]
      expect(JSON.stringify(attributeQuery)).toContain('"tags"')
    })

    it('processes filters object', () => {
      const result = JSON.parse(getListQuery([], { 'info.status': ['active'] }, ['t-container']))
      expect(JSON.stringify(result)).toContain('info.status')
    })

    it('handles multiple tag types simultaneously', () => {
      const result = JSON.parse(
        getListQuery(['ip-192.168.1.1', 'mac-AA:BB', 'sn-123', 'firmware-1.0', 'my-tag']),
      )
      expect(result).toHaveProperty('$and')
    })

    it('ignores empty filters object', () => {
      const result = JSON.parse(getListQuery([], {}))
      expect(result).toHaveProperty('$and')
    })
  })

  describe('getFiltersQuery', () => {
    it('returns parsed query object', () => {
      const result = getFiltersQuery(['tag-1'], undefined, ['t-container'])
      expect(typeof result).toBe('object')
    })

    it('uses empty array when filterTags is undefined', () => {
      const result = getFiltersQuery(undefined, undefined, ['t-container'])
      expect(result).toBeDefined()
    })

    it('returns object with $and', () => {
      const result = getFiltersQuery(['tag-1'])
      expect(result).toHaveProperty('$and')
    })

    it('handles empty filterTags', () => {
      const result = getFiltersQuery([])
      expect(result).toBeDefined()
    })

    it('passes filters through correctly', () => {
      const result = getFiltersQuery([], { 'info.status': ['active'] })
      expect(result).toBeDefined()
    })
  })
})
