'use strict'

const test = require('brittle')
const { GLOBAL_DATA_TYPES } = require('../../workers/lib/constants')

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

const GlobalDataLib = require('../../workers/lib/globalData')

test('GlobalDataLib - constructor', function (t) {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  t.ok(globalDataLib._globalDataBee === mockGlobalDataBee, 'should store globalDataBee')
  t.is(globalDataLib.site, 'test-site', 'should store site')

  t.pass()
})

test('GlobalDataLib - convertRangeToBin', function (t) {
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

test('GlobalDataLib - queryGlobalData', async function (t) {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  const data = await globalDataLib.queryGlobalData(mockGlobalDataBee.sub())

  t.ok(Array.isArray(data), 'should return array')
  t.is(data.length, 2, 'should return correct number of items')
  t.ok(data[0].id === 1, 'should parse first item correctly')
  t.ok(data[1].id === 2, 'should parse second item correctly')

  t.pass()
})

test('GlobalDataLib - filterData', function (t) {
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

test('GlobalDataLib - getGloabalDbDataForType', async function (t) {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  const features = await globalDataLib.getGloabalDbDataForType('features')

  t.ok(typeof features === 'object', 'should return object')
  t.ok(features.test === 'data', 'should parse JSON correctly')

  t.pass()
})

test('GlobalDataLib - getGlobalData with features type', async function (t) {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  const req = { type: GLOBAL_DATA_TYPES.FEATURES }
  const result = await globalDataLib.getGlobalData(req)

  t.ok(typeof result === 'object', 'should return object for features')
  t.ok(result.test === 'data', 'should return features data')

  t.pass()
})

test('GlobalDataLib - getGlobalData with invalid type', async function (t) {
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

test('GlobalDataLib - getGlobalData with groupBy', async function (t) {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  const req = {
    type: GLOBAL_DATA_TYPES.PRODUCTION_COSTS,
    groupBy: 'id'
  }
  const result = await globalDataLib.getGlobalData(req)

  t.ok(typeof result === 'object', 'should return grouped object')

  t.pass()
})

test('GlobalDataLib - setProductionCostsData with valid data', async function (t) {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  const data = {
    year: 2023,
    month: 6,
    energyCost: 1000,
    operationalCost: 2000
  }

  const result = await globalDataLib.setProductionCostsData(data)

  t.is(result, true, 'should return true')

  t.pass()
})

test('GlobalDataLib - setProductionCostsData with invalid year', async function (t) {
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

test('GlobalDataLib - setProductionCostsData with invalid month', async function (t) {
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

test('GlobalDataLib - saveGlobalDataForType with valid data', async function (t) {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  const data = { feature1: true, feature2: false }
  const result = await globalDataLib.saveGlobalDataForType(data, 'features')

  t.is(result, true, 'should return true')

  t.pass()
})

test('GlobalDataLib - saveGlobalDataForType with invalid data', async function (t) {
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

test('GlobalDataLib - setGlobalData with production costs', async function (t) {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  const data = { year: 2023, month: 6 }
  const result = await globalDataLib.setGlobalData(data, GLOBAL_DATA_TYPES.PRODUCTION_COSTS)

  t.is(result, true, 'should return true for production costs')

  t.pass()
})

test('GlobalDataLib - setGlobalData with features', async function (t) {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  const data = { feature1: true }
  const result = await globalDataLib.setGlobalData(data, GLOBAL_DATA_TYPES.FEATURES)

  t.is(result, true, 'should return true for features')

  t.pass()
})

test('GlobalDataLib - setGlobalData with container settings', async function (t) {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  const data = { model: 'test-model', site: 'test-site', setting1: 'value1' }
  const result = await globalDataLib.setGlobalData(data, GLOBAL_DATA_TYPES.CONTAINER_SETTINGS)

  t.is(result, true, 'should return true for container settings')

  t.pass()
})

test('GlobalDataLib - setContainerSettingsData adds new setting to empty hashtable', async function (t) {
  let savedData = null
  const mockBeeEmpty = {
    sub: () => ({
      get: async () => ({ value: '{}' }),
      put: async (key, value) => {
        savedData = JSON.parse(value)
        return true
      }
    })
  }

  const globalDataLib = new GlobalDataLib(mockBeeEmpty, 'test-site')

  const data = {
    model: 'container-bd-d40',
    site: 'Test',
    parameters: { runningSpeed: 100 },
    thresholds: { oilTemperature: { alarm: 45 } }
  }

  const result = await globalDataLib.setContainerSettingsData(data)

  t.is(result, true, 'should return true')
  t.ok(typeof savedData === 'object', 'saved data should be an object')
  t.ok(savedData['container-bd-d40_test-site'], 'should have entry with model_site key')
  t.is(savedData['container-bd-d40_test-site'].model, 'container-bd-d40', 'should save correct model')
  t.is(savedData['container-bd-d40_test-site'].site, 'Test', 'should save correct site')
  t.is(savedData['container-bd-d40_test-site'].thresholds.oilTemperature.alarm, 45, 'should save correct threshold')

  t.pass()
})

test('GlobalDataLib - setContainerSettingsData adds new setting to existing hashtable', async function (t) {
  let savedData = null
  const existingSettings = {
    'existing-model_existing-site': { model: 'existing-model', site: 'existing-site', parameters: {} }
  }
  const mockBeeWithData = {
    sub: () => ({
      get: async () => ({ value: JSON.stringify(existingSettings) }),
      put: async (key, value) => {
        savedData = JSON.parse(value)
        return true
      }
    })
  }

  const globalDataLib = new GlobalDataLib(mockBeeWithData, 'test-site')

  const data = {
    model: 'new-model',
    site: 'new-site',
    parameters: { runningSpeed: 200 }
  }

  const result = await globalDataLib.setContainerSettingsData(data)

  t.is(result, true, 'should return true')
  t.ok(typeof savedData === 'object', 'saved data should be an object')
  t.is(Object.keys(savedData).length, 2, 'hashtable should have two entries')
  t.is(savedData['existing-model_existing-site'].model, 'existing-model', 'should preserve existing entry')
  t.is(savedData['new-model_test-site'].model, 'new-model', 'should add new entry')

  t.pass()
})

test('GlobalDataLib - setContainerSettingsData updates existing setting by model+site (O(1))', async function (t) {
  let savedData = null
  const existingSettings = {
    'model-a_site-1': { model: 'model-a', site: 'site-1', parameters: { runningSpeed: 100 }, thresholds: { alarm: 40 } },
    'model-b_site-2': { model: 'model-b', site: 'site-2', parameters: { runningSpeed: 150 } }
  }
  const mockBeeWithData = {
    sub: () => ({
      get: async () => ({ value: JSON.stringify(existingSettings) }),
      put: async (key, value) => {
        savedData = JSON.parse(value)
        return true
      }
    })
  }

  const globalDataLib = new GlobalDataLib(mockBeeWithData, 'site-1')

  const data = {
    model: 'model-a',
    site: 'site-1',
    parameters: { runningSpeed: 200 },
    thresholds: { alarm: 45 }
  }

  const result = await globalDataLib.setContainerSettingsData(data)

  t.is(result, true, 'should return true')
  t.ok(typeof savedData === 'object', 'saved data should be an object')
  t.is(Object.keys(savedData).length, 2, 'hashtable should still have two entries')
  t.is(savedData['model-a_site-1'].parameters.runningSpeed, 200, 'should update parameters')
  t.is(savedData['model-a_site-1'].thresholds.alarm, 45, 'should update thresholds')
  t.is(savedData['model-b_site-2'].model, 'model-b', 'should preserve other entry')

  t.pass()
})

test('GlobalDataLib - setContainerSettingsData handles existing object data and merges', async function (t) {
  let savedData = null
  const mockBeeWithObject = {
    sub: () => ({
      get: async () => ({ value: '{"legacy-model_legacy-site": {"model": "legacy-model", "site": "legacy-site"}}' }),
      put: async (key, value) => {
        savedData = JSON.parse(value)
        return true
      }
    })
  }

  const globalDataLib = new GlobalDataLib(mockBeeWithObject, 'test-site')

  const data = {
    model: 'new-model',
    site: 'new-site',
    parameters: {}
  }

  const result = await globalDataLib.setContainerSettingsData(data)

  t.is(result, true, 'should return true')
  t.ok(typeof savedData === 'object', 'saved data should be an object')
  t.is(Object.keys(savedData).length, 2, 'hashtable should have two entries (legacy + new)')
  t.is(savedData['legacy-model_legacy-site'].model, 'legacy-model', 'should preserve legacy entry')
  t.is(savedData['new-model_test-site'].model, 'new-model', 'should add new entry')

  t.pass()
})

test('GlobalDataLib - setContainerSettingsData throws error for invalid JSON', async function (t) {
  const globalDataLib = new GlobalDataLib(mockGlobalDataBee, 'test-site')

  const data = 'invalid-json'

  try {
    await globalDataLib.setContainerSettingsData(data)
    t.fail('should throw error for invalid JSON')
  } catch (err) {
    t.is(err.message, 'ERR_INVALID_JSON', 'should throw ERR_INVALID_JSON')
  }

  t.pass()
})

test('GlobalDataLib - setGlobalData with invalid type', async function (t) {
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

test('GlobalDataLib - getGlobalData with containerSettings returns array filtered by this.site', async function (t) {
  const mockBeeWithSettings = {
    sub: () => ({
      get: async () => ({
        value: JSON.stringify({
          'model-a_test-site': { model: 'model-a', site: 'test-site', thresholds: { alarm: 40 } },
          'model-b_test-site': { model: 'model-b', site: 'test-site', thresholds: { alarm: 50 } },
          'model-c_other-site': { model: 'model-c', site: 'other-site', thresholds: { alarm: 60 } }
        })
      }),
      put: async () => true
    })
  }

  const globalDataLib = new GlobalDataLib(mockBeeWithSettings, 'test-site')

  const req = { type: GLOBAL_DATA_TYPES.CONTAINER_SETTINGS }
  const result = await globalDataLib.getGlobalData(req)

  t.ok(Array.isArray(result), 'should return array for containerSettings')
  t.is(result.length, 2, 'should return only entries matching this.site')
  t.ok(result.some(item => item.model === 'model-a'), 'should contain first model')
  t.ok(result.some(item => item.model === 'model-b'), 'should contain second model')
  t.ok(result.every(item => item.site === 'test-site'), 'all results should have this.site')

  t.pass()
})

test('GlobalDataLib - getGlobalData with empty containerSettings returns empty array', async function (t) {
  const mockBeeEmpty = {
    sub: () => ({
      get: async () => ({ value: '{}' }),
      put: async () => true
    })
  }

  const globalDataLib = new GlobalDataLib(mockBeeEmpty, 'test-site')

  const req = { type: GLOBAL_DATA_TYPES.CONTAINER_SETTINGS }
  const result = await globalDataLib.getGlobalData(req)

  t.ok(Array.isArray(result), 'should return array for empty containerSettings')
  t.is(result.length, 0, 'should return empty array')

  t.pass()
})

test('GlobalDataLib - getGlobalData with null containerSettings returns empty array', async function (t) {
  const mockBeeNull = {
    sub: () => ({
      get: async () => null,
      put: async () => true
    })
  }

  const globalDataLib = new GlobalDataLib(mockBeeNull, 'test-site')

  const req = { type: GLOBAL_DATA_TYPES.CONTAINER_SETTINGS }
  const result = await globalDataLib.getGlobalData(req)

  t.ok(Array.isArray(result), 'should return array for null containerSettings')
  t.is(result.length, 0, 'should return empty array')

  t.pass()
})

test('GlobalDataLib - getGlobalData with containerSettings filters by model and this.site', async function (t) {
  const mockBeeWithSettings = {
    sub: () => ({
      get: async () => ({
        value: JSON.stringify({
          'model-a_test-site': { model: 'model-a', site: 'test-site', thresholds: { alarm: 40 } },
          'model-b_test-site': { model: 'model-b', site: 'test-site', thresholds: { alarm: 50 } },
          'model-a_other-site': { model: 'model-a', site: 'other-site', thresholds: { alarm: 45 } }
        })
      }),
      put: async () => true
    })
  }

  const globalDataLib = new GlobalDataLib(mockBeeWithSettings, 'test-site')

  const req = { type: GLOBAL_DATA_TYPES.CONTAINER_SETTINGS, model: 'model-a' }
  const result = await globalDataLib.getGlobalData(req)

  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 1, 'should return only model-a entries for this.site')
  t.is(result[0].model, 'model-a', 'should have correct model')
  t.is(result[0].site, 'test-site', 'should have this.site')

  t.pass()
})

test('GlobalDataLib - getGlobalData with containerSettings returns empty array when no match for model', async function (t) {
  const mockBeeWithSettings = {
    sub: () => ({
      get: async () => ({
        value: JSON.stringify({
          'model-a_test-site': { model: 'model-a', site: 'test-site', thresholds: { alarm: 40 } }
        })
      }),
      put: async () => true
    })
  }

  const globalDataLib = new GlobalDataLib(mockBeeWithSettings, 'test-site')

  const req = { type: GLOBAL_DATA_TYPES.CONTAINER_SETTINGS, model: 'non-existent-model' }
  const result = await globalDataLib.getGlobalData(req)

  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 0, 'should return empty array when no match found')

  t.pass()
})

test('GlobalDataLib - getGlobalData with containerSettings returns empty array when no entries for this.site', async function (t) {
  const mockBeeWithSettings = {
    sub: () => ({
      get: async () => ({
        value: JSON.stringify({
          'model-a_other-site': { model: 'model-a', site: 'other-site', thresholds: { alarm: 40 } }
        })
      }),
      put: async () => true
    })
  }

  const globalDataLib = new GlobalDataLib(mockBeeWithSettings, 'test-site')

  const req = { type: GLOBAL_DATA_TYPES.CONTAINER_SETTINGS }
  const result = await globalDataLib.getGlobalData(req)

  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 0, 'should return empty array when no entries for this.site')

  t.pass()
})

test('GlobalDataLib - getGlobalData with containerSettings filters out invalid entries', async function (t) {
  const mockBeeWithMixedData = {
    sub: () => ({
      get: async () => ({
        value: JSON.stringify({
          'model-a_test-site': { model: 'model-a', site: 'test-site', thresholds: { alarm: 40 } },
          'invalid-key': 'just a string',
          'another-invalid': { noModel: true },
          'missing-site': { model: 'model-c' },
          'model-b_test-site': { model: 'model-b', site: 'test-site', thresholds: { alarm: 50 } },
          'model-c_other-site': { model: 'model-c', site: 'other-site', thresholds: { alarm: 60 } }
        })
      }),
      put: async () => true
    })
  }

  const globalDataLib = new GlobalDataLib(mockBeeWithMixedData, 'test-site')

  const req = { type: GLOBAL_DATA_TYPES.CONTAINER_SETTINGS }
  const result = await globalDataLib.getGlobalData(req)

  t.ok(Array.isArray(result), 'should return array')
  t.is(result.length, 2, 'should only return valid entries with model and site matching this.site')
  t.ok(result.every(item => item.model && item.site === 'test-site'), 'all results should have model and this.site')

  t.pass()
})
