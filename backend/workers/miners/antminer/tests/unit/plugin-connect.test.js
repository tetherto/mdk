'use strict'

const test = require('brittle')
const plugin = require('../../plugin')

const BASE_CONFIG = {
  address: '127.0.0.1',
  username: 'root',
  password: 'root'
}

test('connect applies defaults for port, type, conf and nominal efficiency', async (t) => {
  const miner = await plugin.connect({ ...BASE_CONFIG }, { deviceId: 'dev1' })
  t.is(miner.opts.port, 80)
  t.is(miner.opts.type, 's19xp')
  t.is(miner.opts.id, 'dev1')
  t.is(miner.opts.nominalEfficiencyWThs, 21)
  t.alike(miner.conf, {})
  t.execution(() => miner.emit('error', new Error('ERR_TEST')))
})

test('connect keeps explicit config values', async (t) => {
  const miner = await plugin.connect({
    ...BASE_CONFIG,
    port: 8080,
    type: 'miner-am-s21',
    conf: { pools: [] },
    nominalEfficiencyWThs: 5
  }, { deviceId: 'dev2' })
  t.is(miner.opts.port, 8080)
  t.is(miner.opts.type, 's21')
  t.is(miner.opts.nominalEfficiencyWThs, 5)
  t.alike(miner.conf, { pools: [] })
})

test('connect defaults nominal efficiency to 0 for unknown types', async (t) => {
  const miner = await plugin.connect({ ...BASE_CONFIG, type: 'miner-am-x99' }, { deviceId: 'dev3' })
  t.is(miner.opts.type, 'x99')
  t.is(miner.opts.nominalEfficiencyWThs, 0)
})

test('connect rejects incomplete device config', async (t) => {
  await t.exception(plugin.connect({ address: '127.0.0.1' }, { deviceId: 'dev4' }), /ERR_DEVICE_CONFIG_INVALID/)
  await t.exception(plugin.connect({ address: '127.0.0.1', username: 'root' }, { deviceId: 'dev4' }), /ERR_DEVICE_CONFIG_INVALID/)
})
