'use strict'

const { test } = require('brittle')
const libUtils = require('../../lib/utils')

test('lib/utils re-exports from miningos-tpl-lib-thing', (t) => {
  t.ok(libUtils && typeof libUtils === 'object', 'exports object')
})
