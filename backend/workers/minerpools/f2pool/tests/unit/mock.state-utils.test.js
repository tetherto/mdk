'use strict'

const test = require('brittle')
const {
  addNewWorker,
  generateAndCacheHashrateHistory
} = require('../../mock/initial_states/utils')

test('addNewWorker validates name and duplicates', (t) => {
  const workers = []
  t.exception(() => addNewWorker(workers, { host: 'h' }), /ERR_INVALID_NAME/)

  addNewWorker(workers, { name: 'acct.w1', host: '10.0.0.1' })
  t.is(workers.length, 1)
  t.is(workers[0].hash_rate_info.name, 'w1')
  t.is(workers[0].host, '10.0.0.1')

  t.exception(() => addNewWorker(workers, { name: 'acct.w1', host: 'h2' }), /ERR_WORKER_EXISTS/)
})

test('generateAndCacheHashrateHistory initializes and reuses cache', (t) => {
  const state = {}
  const nowSec = Math.floor(Date.now() / 1000)
  const first = generateAndCacheHashrateHistory(nowSec - 7200, nowSec, state)
  t.ok(Array.isArray(first))
  t.ok(first.length > 0)
  t.ok(state.hashrate_history_cache)

  const second = generateAndCacheHashrateHistory(nowSec - 7200, nowSec, state)
  t.is(second, first)

  const other = generateAndCacheHashrateHistory(nowSec - 3600, nowSec, state)
  t.not(other, first)
})
