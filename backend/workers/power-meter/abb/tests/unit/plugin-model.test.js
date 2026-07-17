'use strict'

const test = require('brittle')
const plugin = require('../../plugin')

test('connect derives the model from the type suffix', async t => {
  await t.exception(
    plugin.connect({ address: '127.0.0.1', port: 5020, unitId: 0, type: 'powermeter-abb-bogus' }, { deviceId: 'x' }),
    /ERR_MODEL_INVALID: bogus/
  )
})

test('connect rejects when neither model nor type is given', async t => {
  await t.exception(
    plugin.connect({ address: '127.0.0.1', port: 5020, unitId: 0 }, { deviceId: 'x' }),
    /ERR_MODEL_INVALID: null/
  )
})
