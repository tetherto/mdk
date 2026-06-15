'use strict'

const test = require('brittle')
const { GLOBAL_DATA_TYPES } = require('../../../workers/lib/constants')

// Mock globalDataBee
const mockGlobalDataBee = {
  sub: () => ({
    get: async () => ({ value: '{"test": "data"}' }),
    put: async () => true,
    createReadStream: () => (async function * () {
      yield { value: Buffer.from('{"id": 1, "data": "test"}') }
      yield { value: Buffer.from('{"id": 2, "data": "test2"}') }
    })()
  })
}

const GlobalDataLib = require('../../../workers/lib/globalData')

test('GlobalDataLib - constructor', (t) => {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  t.ok(globalDataLib._globalDataBee === mockGlobalDataBee, 'should store globalDataBee')
  t.is(globalDataLib.site, 'test-site', 'should store site')

  t.pass()
})

test('GlobalDataLib - convertRangeToBin', (t) => {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  // Test with range containing all properties
  const range = { gt: 100, gte: 200, lt: 300, lte: 400 }
  const result = globalDataLib.convertRangeToBin(range)

  t.ok(Buffer.isBuffer(result.gt), 'gt should be converted to buffer')
  t.ok(Buffer.isBuffer(result.gte), 'gte should be converted to buffer')
  t.ok(Buffer.isBuffer(result.lt), 'lt should be converted to buffer')
  t.ok(Buffer.isBuffer(result.lte), 'lte should be converted to buffer')

  // Test with null range
  const nullResult = globalDataLib.convertRangeToBin(null)
  t.is(nullResult, null, 'should return null for null range')

  // Test with undefined range
  const undefinedResult = globalDataLib.convertRangeToBin(undefined)
  t.is(undefinedResult, undefined, 'should return undefined for undefined range')

  t.pass()
})

test('GlobalDataLib - convertRangeToBin with partial ranges', (t) => {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  // Test with only gt
  const rangeOnlyGt = { gt: 100 }
  const resultGt = globalDataLib.convertRangeToBin(rangeOnlyGt)
  t.ok(Buffer.isBuffer(resultGt.gt), 'gt should be converted to buffer')
  t.ok(!resultGt.gte, 'gte should not exist')

  // Test with only gte
  const rangeOnlyGte = { gte: 200 }
  const resultGte = globalDataLib.convertRangeToBin(rangeOnlyGte)
  t.ok(Buffer.isBuffer(resultGte.gte), 'gte should be converted to buffer')
  t.ok(!resultGte.gt, 'gt should not exist')

  // Test with only lt
  const rangeOnlyLt = { lt: 300 }
  const resultLt = globalDataLib.convertRangeToBin(rangeOnlyLt)
  t.ok(Buffer.isBuffer(resultLt.lt), 'lt should be converted to buffer')
  t.ok(!resultLt.lte, 'lte should not exist')

  // Test with only lte
  const rangeOnlyLte = { lte: 400 }
  const resultLte = globalDataLib.convertRangeToBin(rangeOnlyLte)
  t.ok(Buffer.isBuffer(resultLte.lte), 'lte should be converted to buffer')
  t.ok(!resultLte.lt, 'lt should not exist')

  t.pass()
})

test('GlobalDataLib - queryGlobalData', async (t) => {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  const data = await globalDataLib.queryGlobalData(mockGlobalDataBee.sub())

  t.ok(Array.isArray(data), 'should return array')
  t.is(data.length, 2, 'should return correct number of items')
  t.ok(data[0].id === 1, 'should parse first item correctly')
  t.ok(data[1].id === 2, 'should parse second item correctly')

  t.pass()
})

test('GlobalDataLib - queryGlobalData with range and opts', async (t) => {
  let rangePassed = null
  let optsPassed = null
  const mockBeeWithRange = {
    sub: () => ({
      createReadStream: (range, opts) => {
        rangePassed = range
        optsPassed = opts
        return (async function * () {
          yield { value: Buffer.from('{"id": 3, "data": "test3"}') }
        })()
      }
    })
  }
  const globalDataLib = new GlobalDataLib(mockBeeWithRange, 'test-site')

  const range = { gt: 100, lt: 200 }
  const opts = { limit: 10 }
  const data = await globalDataLib.queryGlobalData(mockBeeWithRange.sub(), range, opts)

  t.ok(Array.isArray(data), 'should return array')
  t.is(data.length, 1, 'should return correct number of items')
  t.ok(rangePassed === range, 'should pass range to createReadStream')
  t.ok(optsPassed === opts, 'should pass opts to createReadStream')

  t.pass()
})

test('GlobalDataLib - queryGlobalData with empty stream', async (t) => {
  const mockBeeEmpty = {
    sub: () => ({
      createReadStream: () => (async function * () {})()
    })
  }
  const globalDataLib = new GlobalDataLib(mockBeeEmpty, 'test-site')

  const data = await globalDataLib.queryGlobalData(mockBeeEmpty.sub())

  t.ok(Array.isArray(data), 'should return array')
  t.is(data.length, 0, 'should return empty array for empty stream')

  t.pass()
})

test('GlobalDataLib - filterData', (t) => {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')
  const data = [{ id: 1, name: 'test1' }, { id: 2, name: 'test2' }]

  // Test basic filtering
  const req = { queryJSON: { id: 1 } }
  const result = globalDataLib.filterData(data, req)

  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 1, 'should return filtered data')
  t.is(result[0].id, 1, 'should return correct filtered item')

  // Test with fields
  const reqWithFields = { queryJSON: {}, fields: { name: 1 } }
  const resultWithFields = globalDataLib.filterData(data, reqWithFields)
  t.ok(Array.isArray(resultWithFields), 'should return array with fields')
  t.is(resultWithFields.length, 2, 'should return all data with fields')

  t.pass()
})

test('GlobalDataLib - filterData with sort', (t) => {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')
  const data = [{ id: 3, name: 'test3' }, { id: 1, name: 'test1' }, { id: 2, name: 'test2' }]

  const req = { queryJSON: {}, sort: { id: 1 } }
  const result = globalDataLib.filterData(data, req)

  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 3, 'should return all items')
  t.is(result[0].id, 1, 'should sort ascending by id')
  t.is(result[1].id, 2, 'should sort ascending by id')
  t.is(result[2].id, 3, 'should sort ascending by id')

  t.pass()
})

test('GlobalDataLib - filterData with offset', (t) => {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')
  const data = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]

  const req = { queryJSON: {}, offset: 2 }
  const result = globalDataLib.filterData(data, req)

  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 2, 'should skip first 2 items')
  t.is(result[0].id, 3, 'should return item after offset')
  t.is(result[1].id, 4, 'should return item after offset')

  t.pass()
})

test('GlobalDataLib - filterData with limit', (t) => {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')
  const data = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]

  const req = { queryJSON: {}, limit: 2 }
  const result = globalDataLib.filterData(data, req)

  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 2, 'should limit to 2 items')
  t.is(result[0].id, 1, 'should return first item')
  t.is(result[1].id, 2, 'should return second item')

  t.pass()
})

test('GlobalDataLib - filterData with sort, offset, and limit', (t) => {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')
  const data = [{ id: 5 }, { id: 1 }, { id: 3 }, { id: 2 }, { id: 4 }]

  const req = { queryJSON: {}, sort: { id: 1 }, offset: 1, limit: 2 }
  const result = globalDataLib.filterData(data, req)

  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 2, 'should limit to 2 items')
  t.is(result[0].id, 2, 'should sort and apply offset correctly')
  t.is(result[1].id, 3, 'should sort and apply offset correctly')

  t.pass()
})

test('GlobalDataLib - filterData with complex queryJSON', (t) => {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')
  const data = [
    { id: 1, status: 'active', score: 100 },
    { id: 2, status: 'inactive', score: 50 },
    { id: 3, status: 'active', score: 75 }
  ]

  const req = { queryJSON: { status: 'active', score: { $gte: 75 } } }
  const result = globalDataLib.filterData(data, req)

  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 2, 'should filter with complex query')
  t.is(result[0].id, 1, 'should match first item')
  t.is(result[1].id, 3, 'should match second item')

  t.pass()
})

test('GlobalDataLib - getGloabalDbDataForType', async (t) => {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  const features = await globalDataLib.getGloabalDbDataForType('features')

  t.ok(typeof features === 'object', 'should return object')
  t.ok(features.test === 'data', 'should parse JSON correctly')

  t.pass()
})

test('GlobalDataLib - getGloabalDbDataForType with null value', async (t) => {
  const mockBee = {
    sub: () => ({
      get: async () => ({ value: null })
    })
  }
  const globalDataLib = new GlobalDataLib(mockBee, 'test-site')

  const result = await globalDataLib.getGloabalDbDataForType('features')

  t.ok(typeof result === 'object', 'should return object')
  t.ok(Object.keys(result).length === 0, 'should return empty object when value is null')

  t.pass()
})

test('GlobalDataLib - getGloabalDbDataForType with undefined res', async (t) => {
  const mockBee = {
    sub: () => ({
      get: async () => undefined
    })
  }
  const globalDataLib = new GlobalDataLib(mockBee, 'test-site')

  const result = await globalDataLib.getGloabalDbDataForType('features')

  t.ok(typeof result === 'object', 'should return object')
  t.ok(Object.keys(result).length === 0, 'should return empty object when res is undefined')

  t.pass()
})

test('GlobalDataLib - getGlobalData with features type', async (t) => {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  const req = { type: GLOBAL_DATA_TYPES.FEATURES }
  const result = await globalDataLib.getGlobalData(req)

  t.ok(typeof result === 'object', 'should return object for features')
  t.ok(result.test === 'data', 'should return features data')

  t.pass()
})

test('GlobalDataLib - getGlobalData with invalid type', async (t) => {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  const req = { type: 'invalid-type' }

  try {
    await globalDataLib.getGlobalData(req)
    t.fail('should throw error for invalid type')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_TYPE', 'should throw ERR_INVALID_TYPE')
  }

  t.pass()
})

test('GlobalDataLib - getGlobalData with groupBy', async (t) => {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  const req = {
    type: GLOBAL_DATA_TYPES.PRODUCTION_COSTS,
    groupBy: 'id',
    query: null,
    fields: null,
    sort: null,
    offset: null,
    limit: null
  }
  const result = await globalDataLib.getGlobalData(req)

  t.ok(typeof result === 'object', 'should return grouped object')
  t.ok(!Array.isArray(result), 'should return object not array when groupBy is used')

  t.pass()
})

test('GlobalDataLib - getGlobalData without groupBy returns array', async (t) => {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  const req = {
    type: GLOBAL_DATA_TYPES.PRODUCTION_COSTS,
    groupBy: null,
    query: null,
    fields: null,
    sort: null,
    offset: null,
    limit: null
  }
  const result = await globalDataLib.getGlobalData(req)

  t.ok(Array.isArray(result), 'should return array when groupBy is not used')
  t.pass()
})

test('GlobalDataLib - getGlobalData with site energy type', async (t) => {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  const req = {
    type: GLOBAL_DATA_TYPES.SITE_ENERGY,
    groupBy: null,
    query: null,
    fields: null,
    sort: null,
    offset: null,
    limit: null
  }
  const result = await globalDataLib.getGlobalData(req)

  t.ok(Array.isArray(result), 'should return array for site energy')
  t.is(result.length, 2, 'should return correct number of items')

  t.pass()
})

test('GlobalDataLib - getGlobalData with query parameter', async (t) => {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  const req = {
    type: GLOBAL_DATA_TYPES.PRODUCTION_COSTS,
    query: { id: 1 },
    fields: null,
    sort: null,
    offset: null,
    limit: null,
    groupBy: null
  }
  const result = await globalDataLib.getGlobalData(req)

  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 1, 'should filter by query')
  t.is(result[0].id, 1, 'should return filtered item')

  t.pass()
})

test('GlobalDataLib - getGlobalData with sort parameter', async (t) => {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  const req = {
    type: GLOBAL_DATA_TYPES.PRODUCTION_COSTS,
    query: null,
    fields: null,
    sort: { id: -1 },
    offset: null,
    limit: null,
    groupBy: null
  }
  const result = await globalDataLib.getGlobalData(req)

  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 2, 'should return all items')
  t.is(result[0].id, 2, 'should sort descending by id')
  t.is(result[1].id, 1, 'should sort descending by id')

  t.pass()
})

test('GlobalDataLib - getGlobalData with offset and limit', async (t) => {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  const req = {
    type: GLOBAL_DATA_TYPES.PRODUCTION_COSTS,
    query: null,
    fields: null,
    sort: null,
    offset: 1,
    limit: 1,
    groupBy: null
  }
  const result = await globalDataLib.getGlobalData(req)

  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 1, 'should apply offset and limit')
  t.is(result[0].id, 2, 'should return item after offset')

  t.pass()
})

test('GlobalDataLib - getGlobalData with range parameter', async (t) => {
  let rangePassed = null
  const mockBeeWithRange = {
    sub: () => ({
      get: async () => ({ value: '{"test": "data"}' }),
      put: async () => true,
      createReadStream: (range) => {
        rangePassed = range
        return (async function * () {
          yield { value: Buffer.from('{"id": 1, "data": "test"}') }
        })()
      }
    })
  }
  const globalDataLib = new GlobalDataLib(mockBeeWithRange, 'test-site')

  const range = { gt: 100, lt: 200 }
  const req = {
    type: GLOBAL_DATA_TYPES.PRODUCTION_COSTS,
    range,
    query: null,
    fields: null,
    sort: null,
    offset: null,
    limit: null,
    groupBy: null
  }
  const result = await globalDataLib.getGlobalData(req)

  t.ok(Array.isArray(result), 'should return array')
  t.ok(rangePassed, 'should pass range to queryGlobalData')
  t.ok(Buffer.isBuffer(rangePassed.gt), 'should convert range to buffers')

  t.pass()
})

test('GlobalDataLib - setProductionCostsData with valid data', async (t) => {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  const data = {
    year: 2023,
    month: 6,
    consumedEnergy: 1000,
    nonConsumedAvailableEnergy: 200,
    nonAvailableConsumedEnergy: 50,
    excessDemandedPower: 100,
    tolls: 50,
    reactiveEnergy: 25,
    grossHRCost: 1000,
    securityCost: 200,
    maintenanceCost: 300,
    hSServicesCost: 150,
    otherCosts: 500
  }

  const result = await globalDataLib.setProductionCostsData(data)

  t.is(result, true, 'should return true')

  t.pass()
})

test('GlobalDataLib - setProductionCostsData with invalid year', async (t) => {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  const data = { year: -1, month: 6 }

  try {
    await globalDataLib.setProductionCostsData(data)
    t.fail('should throw error for invalid year')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_YEAR', 'should throw ERR_INVALID_YEAR')
  }

  t.pass()
})

test('GlobalDataLib - setProductionCostsData with invalid month', async (t) => {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  const data = { year: 2023, month: 13 }

  try {
    await globalDataLib.setProductionCostsData(data)
    t.fail('should throw error for invalid month')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_MONTH', 'should throw ERR_INVALID_MONTH')
  }

  t.pass()
})

test('GlobalDataLib - setProductionCostsData with month zero', async (t) => {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  const data = { year: 2023, month: 0 }

  try {
    await globalDataLib.setProductionCostsData(data)
    t.fail('should throw error for month zero')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_MONTH', 'should throw ERR_INVALID_MONTH')
  }

  t.pass()
})

test('GlobalDataLib - setProductionCostsData with non-integer year', async (t) => {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  const data = { year: 2023.5, month: 6 }

  try {
    await globalDataLib.setProductionCostsData(data)
    t.fail('should throw error for non-integer year')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_YEAR', 'should throw ERR_INVALID_YEAR')
  }

  t.pass()
})

test('GlobalDataLib - setProductionCostsData with non-integer month', async (t) => {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  const data = { year: 2023, month: 6.5 }

  try {
    await globalDataLib.setProductionCostsData(data)
    t.fail('should throw error for non-integer month')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_MONTH', 'should throw ERR_INVALID_MONTH')
  }

  t.pass()
})

test('GlobalDataLib - setProductionCostsData with missing optional fields', async (t) => {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  const data = {
    year: 2023,
    month: 6
  }

  const result = await globalDataLib.setProductionCostsData(data)

  t.is(result, true, 'should return true even with missing optional fields')

  t.pass()
})

test('GlobalDataLib - saveGlobalDataForType with valid data', async (t) => {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  const data = { feature1: true, feature2: false }
  const result = await globalDataLib.saveGlobalDataForType(data, 'features')

  t.is(result, true, 'should return true')

  t.pass()
})

test('GlobalDataLib - saveGlobalDataForType with invalid data', async (t) => {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  const data = 'invalid-json'

  try {
    await globalDataLib.saveGlobalDataForType(data, 'features')
    t.fail('should throw error for invalid JSON')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_JSON', 'should throw ERR_INVALID_JSON')
  }

  t.pass()
})

test('GlobalDataLib - setGlobalData with production costs', async (t) => {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  const data = { year: 2023, month: 6 }
  const result = await globalDataLib.setGlobalData(data, GLOBAL_DATA_TYPES.PRODUCTION_COSTS)

  t.is(result, true, 'should return true for production costs')

  t.pass()
})

test('GlobalDataLib - setGlobalData with features', async (t) => {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  const data = { feature1: true }
  const result = await globalDataLib.setGlobalData(data, GLOBAL_DATA_TYPES.FEATURES)

  t.is(result, true, 'should return true for features')

  t.pass()
})

test('GlobalDataLib - setGlobalData with container settings', async (t) => {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  const data = { setting1: 'value1' }
  const result = await globalDataLib.setGlobalData(data, GLOBAL_DATA_TYPES.CONTAINER_SETTINGS)

  t.is(result, true, 'should return true for container settings')

  t.pass()
})

test('GlobalDataLib - setGlobalData with invalid type', async (t) => {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  const data = { test: 'data' }

  try {
    await globalDataLib.setGlobalData(data, 'invalid-type')
    t.fail('should throw error for invalid type')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_TYPE', 'should throw ERR_INVALID_TYPE')
  }

  t.pass()
})

test('GlobalDataLib - setGlobalData with site energy', async (t) => {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  const data = { energy1: 'value1' }
  const result = await globalDataLib.setGlobalData(data, GLOBAL_DATA_TYPES.SITE_ENERGY)

  t.is(result, true, 'should return true for site energy')

  t.pass()
})

test('GlobalDataLib - getUserSettings with existing user', async (t) => {
  const mockBee = {
    sub: () => ({
      get: async (userId) => {
        t.is(userId, 'user123', 'should get settings for correct user')
        return { value: '{"theme":"dark","notifications":true}' }
      }
    })
  }
  const globalDataLib = new GlobalDataLib(mockBee, 'test-site')

  const result = await globalDataLib.getUserSettings('user123')

  t.ok(typeof result === 'object', 'should return object')
  t.is(result.theme, 'dark', 'should parse JSON correctly')
  t.is(result.notifications, true, 'should parse JSON correctly')

  t.pass()
})

test('GlobalDataLib - getUserSettings with non-existing user', async (t) => {
  const mockBee = {
    sub: () => ({
      get: async () => null
    })
  }
  const globalDataLib = new GlobalDataLib(mockBee, 'test-site')

  const result = await globalDataLib.getUserSettings('user123')

  t.ok(typeof result === 'object', 'should return object')
  t.ok(Object.keys(result).length === 0, 'should return empty object for non-existing user')

  t.pass()
})

test('GlobalDataLib - getUserSettings with null value', async (t) => {
  const mockBee = {
    sub: () => ({
      get: async () => ({ value: null })
    })
  }
  const globalDataLib = new GlobalDataLib(mockBee, 'test-site')

  const result = await globalDataLib.getUserSettings('user123')

  t.ok(typeof result === 'object', 'should return object')
  t.ok(Object.keys(result).length === 0, 'should return empty object when value is null')

  t.pass()
})

test('GlobalDataLib - getUserSettings with undefined res', async (t) => {
  const mockBee = {
    sub: () => ({
      get: async () => undefined
    })
  }
  const globalDataLib = new GlobalDataLib(mockBee, 'test-site')

  const result = await globalDataLib.getUserSettings('user123')

  t.ok(typeof result === 'object', 'should return object')
  t.ok(Object.keys(result).length === 0, 'should return empty object when res is undefined')

  t.pass()
})

test('GlobalDataLib - setUserSettings', async (t) => {
  let putCalled = false
  const mockBee = {
    sub: () => ({
      put: async (userId, data) => {
        putCalled = true
        t.is(userId, 'user123', 'should put settings for correct user')
        t.is(data, '{"theme":"light","notifications":false}', 'should stringify JSON correctly')
        return true
      }
    })
  }
  const globalDataLib = new GlobalDataLib(mockBee, 'test-site')

  const settings = { theme: 'light', notifications: false }
  const result = await globalDataLib.setUserSettings('user123', settings)

  t.is(result, true, 'should return true')
  t.ok(putCalled, 'should call put')

  t.pass()
})
