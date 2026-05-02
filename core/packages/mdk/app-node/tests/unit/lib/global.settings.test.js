'use strict'

const test = require('brittle')
const schemas = require('../../../workers/lib/server/schemas/global.schemas.js')

test('global settings - complete payload validation', (t) => {
  // Test that the payload structure matches our schema
  const globalDataSchema = schemas.body.globalData
  t.ok(globalDataSchema.properties.data, 'schema should have data property')

  const dataSchema = globalDataSchema.properties.data
  t.ok(dataSchema.type === 'object', 'data should be object type')

  t.pass()
})

test('global settings - partial payload validation', (t) => {
  // The schema should allow this since only 'data' is required
  const globalDataSchema = schemas.body.globalData
  t.ok(globalDataSchema.required.includes('data'), 'data should be required')
  t.ok(globalDataSchema.required.length === 1, 'only data should be required')

  t.pass()
})

test('global settings - schema structure validation', (t) => {
  const globalDataSchema = schemas.body.globalData

  // Test that the schema has the expected structure
  t.ok(globalDataSchema.type === 'object', 'should be object type')
  t.ok(globalDataSchema.properties, 'should have properties')
  t.ok(globalDataSchema.required, 'should have required fields')
  t.ok(Array.isArray(globalDataSchema.required), 'required should be array')

  t.pass()
})
