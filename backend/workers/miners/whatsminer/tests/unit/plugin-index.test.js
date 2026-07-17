'use strict'

const test = require('brittle')
const plugin = require('../../plugin/index')

const BASE_CONFIG = {
  address: '127.0.0.1',
  port: 4028,
  password: 'admin'
}

test('connect - rejects incomplete device config', async (t) => {
  await t.exception(plugin.connect({}, { deviceId: 'd1' }), /ERR_DEVICE_CONFIG_INVALID/)
  await t.exception(plugin.connect({ address: '127.0.0.1', port: 4028 }, { deviceId: 'd1' }), /ERR_DEVICE_CONFIG_INVALID/)
})

test('connect - defaults type and nominal efficiency when unknown', async (t) => {
  const miner = await plugin.connect({ ...BASE_CONFIG }, { deviceId: 'd1' })
  t.is(miner.opts.type, 'miner-wm')
  t.is(miner.opts.id, 'd1')
  t.is(miner.opts.nominalEfficiencyWThs, 0)
})

test('connect - resolves nominal efficiency from type map', async (t) => {
  const miner = await plugin.connect({ ...BASE_CONFIG, type: 'miner-wm-m56s' }, { deviceId: 'd2' })
  t.is(miner.opts.type, 'miner-wm-m56s')
  t.is(miner.opts.nominalEfficiencyWThs, 26)
})

test('connect - explicit nominal efficiency wins over type map', async (t) => {
  const miner = await plugin.connect({ ...BASE_CONFIG, type: 'miner-wm-m56s', nominalEfficiencyWThs: 40 }, { deviceId: 'd3' })
  t.is(miner.opts.nominalEfficiencyWThs, 40)
})

test('connect - device error events are absorbed by the debug listener', async (t) => {
  const miner = await plugin.connect({ ...BASE_CONFIG }, { deviceId: 'd4' })
  t.is(miner.listenerCount('error'), 1)
  miner.emit('error', new Error('ERR_DEVICE_UNREACHABLE'))
  t.pass('emit did not throw')
})

test('disconnect - closes the device', async (t) => {
  let closed = false
  await plugin.disconnect({ close: async () => { closed = true } })
  t.ok(closed)
})

test('plugin - exposes contract and handler dir', (t) => {
  t.is(typeof plugin.contract, 'object')
  t.is(typeof plugin.dir, 'string')
})
