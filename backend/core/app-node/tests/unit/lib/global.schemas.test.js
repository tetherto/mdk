'use strict'

const test = require('brittle')
const schemas = require('../../../workers/lib/server/schemas/global.schemas')

test('global schemas - query type schema', (t) => {
  const typeSchema = schemas.query.type

  t.ok(typeSchema.type === 'object', 'should be object type')
  t.ok(typeSchema.properties.type, 'should have type property')
  t.ok(typeSchema.properties.type.type === 'string', 'type property should be string')
  t.ok(typeSchema.required.includes('type'), 'type should be required')

  t.pass()
})

test('global schemas - query globalData schema', (t) => {
  const globalDataSchema = schemas.query.globalData

  t.ok(globalDataSchema.type === 'object', 'should be object type')
  t.ok(globalDataSchema.properties.type, 'should have type property')
  t.ok(globalDataSchema.properties.gt, 'should have gt property')
  t.ok(globalDataSchema.properties.gte, 'should have gte property')
  t.ok(globalDataSchema.properties.lte, 'should have lte property')
  t.ok(globalDataSchema.properties.lt, 'should have lt property')
  t.ok(globalDataSchema.properties.limit, 'should have limit property')
  t.ok(globalDataSchema.properties.reverse, 'should have reverse property')
  t.ok(globalDataSchema.properties.query, 'should have query property')
  t.ok(globalDataSchema.properties.groupBy, 'should have groupBy property')
  t.ok(globalDataSchema.properties.overwriteCache, 'should have overwriteCache property')
  t.ok(globalDataSchema.required.includes('type'), 'type should be required')

  // Test property types
  t.ok(globalDataSchema.properties.type.type === 'string', 'type should be string')
  t.ok(globalDataSchema.properties.gt.type === 'integer', 'gt should be integer')
  t.ok(globalDataSchema.properties.gte.type === 'integer', 'gte should be integer')
  t.ok(globalDataSchema.properties.lte.type === 'integer', 'lte should be integer')
  t.ok(globalDataSchema.properties.lt.type === 'integer', 'lt should be integer')
  t.ok(globalDataSchema.properties.limit.type === 'integer', 'limit should be integer')
  t.ok(globalDataSchema.properties.reverse.type === 'boolean', 'reverse should be boolean')
  t.ok(globalDataSchema.properties.query.type === 'string', 'query should be string')
  t.ok(globalDataSchema.properties.groupBy.type === 'string', 'groupBy should be string')
  t.ok(globalDataSchema.properties.overwriteCache.type === 'boolean', 'overwriteCache should be boolean')

  t.pass()
})

test('global schemas - query features schema', (t) => {
  const featuresSchema = schemas.query.features

  t.ok(featuresSchema.type === 'object', 'should be object type')
  t.ok(featuresSchema.properties.overwriteCache, 'should have overwriteCache property')
  t.ok(featuresSchema.properties.overwriteCache.type === 'boolean', 'overwriteCache should be boolean')

  t.pass()
})

test('global schemas - query globalConfig schema', (t) => {
  const globalConfigSchema = schemas.query.globalConfig

  t.ok(globalConfigSchema.type === 'object', 'should be object type')
  t.ok(globalConfigSchema.properties.fields, 'should have fields property')
  t.ok(globalConfigSchema.properties.overwriteCache, 'should have overwriteCache property')
  t.ok(globalConfigSchema.properties.fields.type === 'string', 'fields should be string')
  t.ok(globalConfigSchema.properties.overwriteCache.type === 'boolean', 'overwriteCache should be boolean')

  t.pass()
})

test('global schemas - body globalData schema', (t) => {
  const globalDataSchema = schemas.body.globalData

  t.ok(globalDataSchema.type === 'object', 'should be object type')
  t.ok(globalDataSchema.properties.data, 'should have data property')
  t.ok(globalDataSchema.properties.data.type === 'object', 'data should be object type')
  t.ok(globalDataSchema.required.includes('data'), 'data should be required')

  t.pass()
})

test('global schemas - body features schema', (t) => {
  const featuresSchema = schemas.body.features

  t.ok(featuresSchema.type === 'object', 'should be object type')
  t.ok(featuresSchema.properties.data, 'should have data property')
  t.ok(featuresSchema.properties.data.type === 'object', 'data should be object type')
  t.ok(featuresSchema.required.includes('data'), 'data should be required')

  t.pass()
})

test('global schemas - body globalConfig schema', (t) => {
  const globalConfigSchema = schemas.body.globalConfig

  t.ok(globalConfigSchema.type === 'object', 'should be object type')
  t.ok(globalConfigSchema.properties.data, 'should have data property')
  t.ok(globalConfigSchema.properties.data.type === 'object', 'data should be object type')
  t.ok(globalConfigSchema.required.includes('data'), 'data should be required')

  // Test data properties
  const dataSchema = globalConfigSchema.properties.data
  t.ok(dataSchema.properties.isAutoSleepAllowed, 'should have isAutoSleepAllowed property')
  t.ok(dataSchema.properties.isAutoSleepAllowed.type === 'boolean', 'isAutoSleepAllowed should be boolean')
  t.ok(dataSchema.required.includes('isAutoSleepAllowed'), 'isAutoSleepAllowed should be required')

  t.pass()
})

test('global schemas - schema structure validation', (t) => {
  // Test that all schemas have the expected structure
  t.ok(schemas.query, 'should have query schemas')
  t.ok(schemas.body, 'should have body schemas')

  // Test query schemas
  t.ok(schemas.query.type, 'should have type query schema')
  t.ok(schemas.query.globalData, 'should have globalData query schema')
  t.ok(schemas.query.features, 'should have features query schema')
  t.ok(schemas.query.globalConfig, 'should have globalConfig query schema')

  // Test body schemas
  t.ok(schemas.body.globalData, 'should have globalData body schema')
  t.ok(schemas.body.features, 'should have features body schema')
  t.ok(schemas.body.globalConfig, 'should have globalConfig body schema')

  t.pass()
})

test('global schemas - schema property validation', (t) => {
  // Test that all schemas have type property
  Object.values(schemas.query).forEach(schema => {
    t.ok(schema.type, 'query schema should have type property')
    t.ok(schema.type === 'object', 'query schema type should be object')
  })

  Object.values(schemas.body).forEach(schema => {
    t.ok(schema.type, 'body schema should have type property')
    t.ok(schema.type === 'object', 'body schema type should be object')
  })

  t.pass()
})

test('global schemas - required fields validation', (t) => {
  // Test that required fields are properly defined
  const typeSchema = schemas.query.type
  t.ok(Array.isArray(typeSchema.required), 'type schema should have required array')
  t.ok(typeSchema.required.length === 1, 'type schema should have exactly one required field')
  t.ok(typeSchema.required.includes('type'), 'type should be required in type schema')

  const globalDataQuerySchema = schemas.query.globalData
  t.ok(Array.isArray(globalDataQuerySchema.required), 'globalData query schema should have required array')
  t.ok(globalDataQuerySchema.required.length === 1, 'globalData query schema should have exactly one required field')
  t.ok(globalDataQuerySchema.required.includes('type'), 'type should be required in globalData query schema')

  const globalDataBodySchema = schemas.body.globalData
  t.ok(Array.isArray(globalDataBodySchema.required), 'globalData body schema should have required array')
  t.ok(globalDataBodySchema.required.length === 1, 'globalData body schema should have exactly one required field')
  t.ok(globalDataBodySchema.required.includes('data'), 'data should be required in globalData body schema')

  t.pass()
})

test('global schemas - data type consistency', (t) => {
  // Test that data properties are consistently typed as objects
  const globalDataBodySchema = schemas.body.globalData
  const featuresBodySchema = schemas.body.features
  const globalConfigBodySchema = schemas.body.globalConfig

  t.ok(globalDataBodySchema.properties.data.type === 'object', 'globalData data should be object')
  t.ok(featuresBodySchema.properties.data.type === 'object', 'features data should be object')
  t.ok(globalConfigBodySchema.properties.data.type === 'object', 'globalConfig data should be object')

  t.pass()
})

test('global schemas - boolean properties validation', (t) => {
  // Test that boolean properties are properly typed
  const globalDataQuerySchema = schemas.query.globalData
  const featuresQuerySchema = schemas.query.features
  const globalConfigQuerySchema = schemas.query.globalConfig
  const globalConfigBodySchema = schemas.body.globalConfig

  t.ok(globalDataQuerySchema.properties.reverse.type === 'boolean', 'reverse should be boolean')
  t.ok(globalDataQuerySchema.properties.overwriteCache.type === 'boolean', 'overwriteCache should be boolean')
  t.ok(featuresQuerySchema.properties.overwriteCache.type === 'boolean', 'features overwriteCache should be boolean')
  t.ok(globalConfigQuerySchema.properties.overwriteCache.type === 'boolean', 'globalConfig overwriteCache should be boolean')
  t.ok(globalConfigBodySchema.properties.data.properties.isAutoSleepAllowed.type === 'boolean', 'isAutoSleepAllowed should be boolean')

  t.pass()
})

test('global schemas - integer properties validation', (t) => {
  // Test that integer properties are properly typed
  const globalDataQuerySchema = schemas.query.globalData

  t.ok(globalDataQuerySchema.properties.gt.type === 'integer', 'gt should be integer')
  t.ok(globalDataQuerySchema.properties.gte.type === 'integer', 'gte should be integer')
  t.ok(globalDataQuerySchema.properties.lte.type === 'integer', 'lte should be integer')
  t.ok(globalDataQuerySchema.properties.lt.type === 'integer', 'lt should be integer')
  t.ok(globalDataQuerySchema.properties.limit.type === 'integer', 'limit should be integer')

  t.pass()
})

test('global schemas - string properties validation', (t) => {
  // Test that string properties are properly typed
  const globalDataQuerySchema = schemas.query.globalData
  const globalConfigQuerySchema = schemas.query.globalConfig

  t.ok(globalDataQuerySchema.properties.type.type === 'string', 'type should be string')
  t.ok(globalDataQuerySchema.properties.query.type === 'string', 'query should be string')
  t.ok(globalDataQuerySchema.properties.groupBy.type === 'string', 'groupBy should be string')
  t.ok(globalConfigQuerySchema.properties.fields.type === 'string', 'fields should be string')

  t.pass()
})
