'use strict'

const { test } = require('brittle')
const { startBitdeerWorker } = require('../../plugin/boot')

test('startBitdeerWorker rejects without workerId', async (t) => {
  await t.exception(() => startBitdeerWorker(), /ERR_WORKER_ID_REQUIRED/, 'no opts')
  await t.exception(() => startBitdeerWorker({}), /ERR_WORKER_ID_REQUIRED/, 'no workerId')
})

test('startBitdeerWorker rejects invalid model', async (t) => {
  await t.exception(() => startBitdeerWorker({ workerId: 'w1', model: 'nope' }), /ERR_MODEL_INVALID/, 'bad model')
})

test('startBitdeerWorker rejects without storeDir', async (t) => {
  await t.exception(() => startBitdeerWorker({ workerId: 'w1', model: 'm56' }), /ERR_STORE_DIR_REQUIRED/, 'no storeDir')
})
