'use strict'

const test = require('brittle')
const { resolveFamily, WORKER_FAMILY } = require('../../plugins/site/lib/site')

test('resolveFamily prefers contract deviceFamily', (t) => {
  const family = resolveFamily({ workerId: 'whatsminer-worker' }, {
    config: { contract: { deviceFamily: 'miner' } }
  })
  t.is(family, 'miner')
})

test('resolveFamily falls back to workerId map when config is missing', (t) => {
  t.is(resolveFamily({ workerId: 'antspace-worker' }, null), 'container')
  t.is(resolveFamily({ workerId: 'avalon-worker' }, null), 'miner')
  t.is(resolveFamily({ workerId: 'bitdeer-worker' }, {}), 'container')
})

test('WORKER_FAMILY covers all full-site workers', (t) => {
  t.is(Object.keys(WORKER_FAMILY).length, 12)
})
