'use strict'

const test = require('brittle')
const { hasWritePermission, hasPermission } = require('../../lib/permissions')

test('permissions - hasWritePermission matches exact and composite levels', (t) => {
  t.ok(hasWritePermission(['miner:w'], 'miner'))
  t.ok(hasWritePermission(['miner:rw'], 'miner'))
  t.ok(!hasWritePermission(['miner:r'], 'miner'))
  t.ok(!hasWritePermission(['container:w'], 'miner'))
  t.ok(hasPermission(['site:rw'], 'site:w'))
})
