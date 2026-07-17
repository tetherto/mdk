'use strict'

const test = require('brittle')
const { resolveFamily, WORKER_FAMILY } = require('../../plugins/site/lib/site')

test('resolveFamily prefers contract deviceFamily', (t) => {
  t.is(resolveFamily({ workerId: 'whatsminer-worker' }, { config: { contract: { deviceFamily: 'miner' } } }), 'miner')
  t.is(resolveFamily({ workerId: 'whatsminer-worker' }, { config: { contract: { deviceFamily: 'container' } } }), 'container')
})

test('resolveFamily falls back to workerId map when config is missing', (t) => {
  t.is(resolveFamily({ workerId: 'antspace-worker' }, null), 'container')
  t.is(resolveFamily({ workerId: 'avalon-worker' }, null), 'miner')
  t.is(resolveFamily({ workerId: 'bitdeer-worker' }, {}), 'container')
  t.is(resolveFamily({ workerId: 'f2pool-worker' }, null), 'minerpool')
  t.is(resolveFamily({ workerId: 'seneca-sensor-worker' }, null), 'sensor')
  t.is(resolveFamily({ workerId: 'satec-powermeter-worker' }, null), 'power-meter')
})

test('resolveFamily returns null for an unknown workerId', (t) => {
  t.is(resolveFamily({ workerId: 'unknown-worker' }, null), null)
  t.is(resolveFamily({ workerId: 'unknown-worker' }, {}), null)
})

test('WORKER_FAMILY covers all 12 site-backend workers', (t) => {
  t.is(Object.keys(WORKER_FAMILY).length, 12)
  t.is(WORKER_FAMILY['whatsminer-worker'], 'miner')
  t.is(WORKER_FAMILY['antminer-worker'], 'miner')
  t.is(WORKER_FAMILY['avalon-worker'], 'miner')
  t.is(WORKER_FAMILY['container-worker'], 'container')
  t.is(WORKER_FAMILY['antspace-worker'], 'container')
  t.is(WORKER_FAMILY['bitdeer-worker'], 'container')
  t.is(WORKER_FAMILY['powermeter-worker'], 'power-meter')
  t.is(WORKER_FAMILY['satec-powermeter-worker'], 'power-meter')
  t.is(WORKER_FAMILY['schneider-powermeter-worker'], 'power-meter')
  t.is(WORKER_FAMILY['seneca-sensor-worker'], 'sensor')
  t.is(WORKER_FAMILY['minerpool-worker'], 'minerpool')
  t.is(WORKER_FAMILY['f2pool-worker'], 'minerpool')
})
