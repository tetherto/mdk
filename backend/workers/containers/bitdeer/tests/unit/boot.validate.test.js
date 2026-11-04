'use strict'

const { test } = require('brittle')
const { startBitdeerWorker, isLoopback, hasMqttCredentials } = require('../../plugin/boot')

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

test('isLoopback decides whether an anonymous broker needs the loud warning', (t) => {
  for (const host of ['127.0.0.1', '127.0.0.2', '::1', 'localhost']) t.ok(isLoopback(host), `${host} is loopback`)
  for (const host of ['0.0.0.0', '::', '192.168.1.10', '10.0.0.5']) t.absent(isLoopback(host), `${host} is reachable from the network`)
})

test('hasMqttCredentials treats an empty map as no login, as secureBroker does', (t) => {
  t.absent(hasMqttCredentials(undefined), 'none')
  t.absent(hasMqttCredentials({}), 'empty map leaves the broker anonymous')
  t.ok(hasMqttCredentials({ 'D40-1': { username: 'u', password: 'p' } }), 'one entry requires a login')
})
