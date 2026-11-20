'use strict'

const sweep = require('@tetherto/mdk-worker/sweep-memo')()
const device = require('./device')
const call = require('./call')

// One `stats` and one `estats` call serve every channel of a poll sweep; a
// miner that has gone away fails instead of answering from a cache.
module.exports = {
  stats: (params) => sweep(params, 'stats', () => call(() => device.getStats())),
  estats: (params) => sweep(params, 'estats', () => call(() => device.getEStats()))
}
