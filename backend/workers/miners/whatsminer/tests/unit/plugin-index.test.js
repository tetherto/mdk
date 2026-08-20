'use strict'

const test = require('brittle')
const plugin = require('../../plugin/index')
const WhatsminerApiV2Client = require('../../lib/whatsminer-api-v2-client')
const WhatsminerApiV3Client = require('../../lib/whatsminer-api-v3-client')
const legacyWhatsminerPath = require('../../lib/whatsminer')
const packageExports = require('../..')

const BASE_CONFIG = {
  address: '127.0.0.1',
  port: 4028,
  password: 'admin',
  probe: false
}

test('exports - keeps Whatsminer as a backward-compatible API v2 alias', (t) => {
  t.is(legacyWhatsminerPath, WhatsminerApiV2Client)
  t.is(packageExports.Whatsminer, WhatsminerApiV2Client)
  t.is(packageExports.WhatsminerApiV2Client, WhatsminerApiV2Client)
})

test('connect - rejects incomplete device config', async (t) => {
  await t.exception(plugin.connect({}, { deviceId: 'd1' }), /ERR_DEVICE_CONFIG_INVALID/)
  await t.exception(plugin.connect({ address: '127.0.0.1', port: 4028 }, { deviceId: 'd1' }), /ERR_DEVICE_CONFIG_INVALID/)
})

test('connect - rejects unsupported versions and ambiguous no-probe custom ports', async (t) => {
  await t.exception(plugin.connect({
    address: '127.0.0.1',
    password: 'super',
    apiVersion: '4.0.0',
    probe: false
  }, { deviceId: 'bad-version' }), /ERR_UNSUPPORTED_API_VERSION/)
  await t.exception(plugin.connect({
    address: '127.0.0.1',
    port: 14433,
    password: 'super',
    probe: false
  }, { deviceId: 'ambiguous-port' }), /ERR_API_VERSION_REQUIRED_FOR_CUSTOM_PORT/)
})

test('connect - defaults to API v3 on port 4433', async (t) => {
  const miner = await plugin.connect({
    address: '127.0.0.1',
    password: 'super',
    probe: false
  }, { deviceId: 'v3' })
  t.is(miner.apiVersion, '3.0.3')
  t.is(miner.opts.port, 4433)
  t.ok(miner instanceof WhatsminerApiV3Client)
  t.not(miner instanceof WhatsminerApiV2Client)
})

test('connect - selects legacy API v2 from port 4028', async (t) => {
  const miner = await plugin.connect({ ...BASE_CONFIG }, { deviceId: 'v2' })
  t.is(miner.apiVersion, '2.0.5')
  t.is(miner.opts.port, 4028)
  t.ok(miner instanceof WhatsminerApiV2Client)
  t.is(miner.constructor.name, 'WhatsminerApiV2Client')
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
