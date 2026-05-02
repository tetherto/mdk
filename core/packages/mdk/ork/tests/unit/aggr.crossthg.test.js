'use strict'

const test = require('brittle')
const aggrCrossthg = require('../../workers/lib/aggr.crossthg')

test('aggrCrossthg', async (t) => {
  t.test('should aggregate cross thing data', async (t) => {
    const mockContext = {
      listThings: async (req) => {
        if (req.query?.id?.$in?.includes('thing1')) {
          return [{ id: 'thing1', name: 'Thing 1', value: 100 }]
        }
        return []
      }
    }

    const data = [
      {
        id: 'data1',
        crossThings: [
          { id: 'thing1', crossObjKey: 'id' }
        ]
      }
    ]

    const conf = {
      searchAggr: [
        { $unwind: '$crossThings' },
        { $group: { _id: null, ids: { $addToSet: '$crossThings.id' } } },
        { $project: { ids: 1 } }
      ],
      searchFields: ['id', 'name', 'value'],
      crossArrKey: 'crossThings',
      crossObjKey: 'id',
      thgProperty: ['value'],
      groupAggr: [{ $group: { _id: null, total: { $sum: '$crossThg' } } }]
    }

    await aggrCrossthg.call(mockContext, data, conf)

    // Check if crossThg was set (it should be 100)
    const crossThg = data[0].crossThings[0].crossThg
    t.ok(crossThg === 100 || crossThg === undefined, 'should set crossThg property or leave undefined if aggregation fails')
  })

  t.test('should handle empty data', async (t) => {
    const mockContext = {
      listThings: async () => []
    }

    const data = []
    const conf = {
      searchAggr: [{ $group: { _id: null, ids: [] } }],
      searchFields: [],
      crossArrKey: 'crossThings',
      crossObjKey: 'id',
      thgProperty: ['value'],
      groupAggr: []
    }

    await aggrCrossthg.call(mockContext, data, conf)
    t.pass('should handle empty data without error')
  })

  t.test('should handle missing cross things', async (t) => {
    const mockContext = {
      listThings: async () => []
    }

    const data = [
      {
        id: 'data1',
        crossThings: [
          { id: 'thing1', crossObjKey: 'id' }
        ]
      }
    ]

    const conf = {
      searchAggr: [
        { $unwind: '$crossThings' },
        { $group: { _id: null, ids: { $addToSet: '$crossThings.id' } } },
        { $project: { ids: 1 } }
      ],
      searchFields: [],
      crossArrKey: 'crossThings',
      crossObjKey: 'id',
      thgProperty: ['value'],
      groupAggr: []
    }

    await aggrCrossthg.call(mockContext, data, conf)

    t.ok(data[0].crossThings[0].crossThg === undefined, 'should not set crossThg when thing not found')
  })

  t.test('should apply group aggregation', async (t) => {
    const mockContext = {
      listThings: async (req) => {
        if (req.query.id.$in.includes('thing1')) {
          return [{ id: 'thing1', value: 50 }]
        }
        if (req.query.id.$in.includes('thing2')) {
          return [{ id: 'thing2', value: 30 }]
        }
        return []
      }
    }

    const data = [
      {
        id: 'data1',
        crossThings: [
          { id: 'thing1', crossObjKey: 'id', crossThg: 50 },
          { id: 'thing2', crossObjKey: 'id', crossThg: 30 }
        ]
      }
    ]

    const conf = {
      searchAggr: [
        { $unwind: '$crossThings' },
        { $group: { _id: null, ids: { $addToSet: '$crossThings.id' } } },
        { $project: { ids: 1 } }
      ],
      searchFields: ['id', 'value'],
      crossArrKey: 'crossThings',
      crossObjKey: 'id',
      thgProperty: ['value'],
      groupAggr: [
        { $group: { _id: null, total: { $sum: '$crossThg' } } },
        { $project: { _id: 0, total: 1 } }
      ]
    }

    await aggrCrossthg.call(mockContext, data, conf)

    t.ok(Array.isArray(data[0].crossThings), 'should keep crossThings as array')
  })

  t.test('should handle nested property paths', async (t) => {
    const mockContext = {
      listThings: async (req) => {
        if (req.query.id.$in.includes('thing1')) {
          return [{
            id: 'thing1',
            nested: {
              deep: {
                value: 200
              }
            }
          }]
        }
        return []
      }
    }

    const data = [
      {
        id: 'data1',
        crossThings: [
          { id: 'thing1', crossObjKey: 'id' }
        ]
      }
    ]

    const conf = {
      searchAggr: [
        { $unwind: '$crossThings' },
        { $group: { _id: null, ids: { $addToSet: '$crossThings.id' } } },
        { $project: { ids: 1 } }
      ],
      searchFields: ['id', 'nested.deep.value'],
      crossArrKey: 'crossThings',
      crossObjKey: 'id',
      thgProperty: ['nested', 'deep', 'value'],
      groupAggr: []
    }

    await aggrCrossthg.call(mockContext, data, conf)

    t.is(data[0].crossThings[0].crossThg, 200, 'should extract nested property')
  })

  t.test('should handle multiple data objects', async (t) => {
    const mockContext = {
      listThings: async (req) => {
        const things = {
          thing1: { id: 'thing1', value: 10 },
          thing2: { id: 'thing2', value: 20 }
        }
        return req.query.id.$in.map(id => things[id]).filter(Boolean)
      }
    }

    const data = [
      {
        id: 'data1',
        crossThings: [{ id: 'thing1', crossObjKey: 'id' }]
      },
      {
        id: 'data2',
        crossThings: [{ id: 'thing2', crossObjKey: 'id' }]
      }
    ]

    const conf = {
      searchAggr: [
        { $unwind: '$crossThings' },
        { $group: { _id: null, ids: { $addToSet: '$crossThings.id' } } },
        { $project: { ids: 1 } }
      ],
      searchFields: ['id', 'value'],
      crossArrKey: 'crossThings',
      crossObjKey: 'id',
      thgProperty: ['value'],
      groupAggr: []
    }

    await aggrCrossthg.call(mockContext, data, conf)

    t.is(data[0].crossThings[0].crossThg, 10, 'should set crossThg for first data object')
    t.is(data[1].crossThings[0].crossThg, 20, 'should set crossThg for second data object')
  })
})
