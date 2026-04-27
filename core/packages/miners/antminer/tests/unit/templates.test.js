'use strict'

const test = require('brittle')
const stats = require('../../lib/templates/stats.js')

test('stats template exports specs.miner', (t) => {
  t.ok(stats.specs.miner, 'miner stats specs exist')
})

test('stats template specs.miner is set from miner_default', (t) => {
  t.ok(stats.specs.miner, 'miner specs exist')
})
