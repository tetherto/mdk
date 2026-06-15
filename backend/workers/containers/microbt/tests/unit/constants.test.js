'use strict'

const { test } = require('brittle')
const { CONTAINER_TYPES } = require('../../lib/utils/constants')

test('CONTAINER_TYPES has WONDERINT and KEHUA', (t) => {
  t.is(CONTAINER_TYPES.WONDERINT, 'wonderint', 'WONDERINT value')
  t.is(CONTAINER_TYPES.KEHUA, 'kehua', 'KEHUA value')
})

test('CONTAINER_TYPES only has expected keys', (t) => {
  const keys = Object.keys(CONTAINER_TYPES)
  t.is(keys.length, 2, 'two keys')
  t.ok(keys.includes('WONDERINT'), 'has WONDERINT')
  t.ok(keys.includes('KEHUA'), 'has KEHUA')
})
