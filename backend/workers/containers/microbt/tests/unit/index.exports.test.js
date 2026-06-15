'use strict'

const { test } = require('brittle')
const index = require('../../index')

test('index exports MBT_WONDERINT and MBT_KEHUA managers', (t) => {
  t.ok(typeof index.MBT_WONDERINT === 'function', 'MBT_WONDERINT is a constructor')
  t.ok(typeof index.MBT_KEHUA === 'function', 'MBT_KEHUA is a constructor')
})
