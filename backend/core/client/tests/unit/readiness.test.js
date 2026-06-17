'use strict'

// waitForWorkers / waitForDevice — hermetic, via the { transport } seam. The
// fake transport answers WORKER_LIST with whatever its `respond(n)` returns for
// the n-th call, so a wait can observe a registry that fills in over polls.

const test = require('brittle')
const { createMdkClient } = require('../../index')

function fakeTransport (respond) {
  const t = { calls: 0 }
  t.connect = async () => {}
  t.close = async () => {}
  t.request = async () => { t.calls++; return respond(t.calls) }
  return t
}

const READY = (workerId, deviceIds) => ({ workerId, state: 'READY', healthState: 'HEALTHY', deviceIds })

test('waitForWorkers - resolves once `count` READY workers appear', async (t) => {
  const transport = fakeTransport((n) => n < 3
    ? { workers: [] }
    : { workers: [READY('w1', ['d1']), READY('w2', ['d2'])] })
  const client = createMdkClient({ transport })
  await client.connect()

  const ready = await client.waitForWorkers({ count: 2, intervalMs: 1 })
  t.is(ready.length, 2, 'returns the matching workers')
  t.is(ready[0].deviceCount, 1, 'workers are getStatus-shaped')
})

test('waitForWorkers - throws ERR_MDK_WAIT_WORKERS_TIMEOUT when never satisfied', async (t) => {
  const transport = fakeTransport(() => ({ workers: [] }))
  const client = createMdkClient({ transport })
  await client.connect()

  await t.exception(() => client.waitForWorkers({ count: 1, timeoutMs: 25, intervalMs: 5 }), /ERR_MDK_WAIT_WORKERS_TIMEOUT/)
})

test('waitForWorkers - requireDevices gates deviceless READY workers', async (t) => {
  const transport = fakeTransport(() => ({ workers: [READY('w1', [])] }))
  const client = createMdkClient({ transport })
  await client.connect()

  // Default requireDevices:true → a deviceless worker never satisfies → timeout.
  await t.exception(() => client.waitForWorkers({ count: 1, timeoutMs: 25, intervalMs: 5 }), /ERR_MDK_WAIT_WORKERS_TIMEOUT/)
  // requireDevices:false → the same worker satisfies immediately.
  const ready = await client.waitForWorkers({ count: 1, requireDevices: false, intervalMs: 1 })
  t.is(ready.length, 1)
})

test('waitForWorkers - a failing poll is swallowed and retried', async (t) => {
  const transport = fakeTransport((n) => {
    if (n === 1) throw new Error('CHANNEL_CLOSED')
    return { workers: [READY('w1', ['d1'])] }
  })
  const client = createMdkClient({ transport })
  await client.connect()

  const ready = await client.waitForWorkers({ count: 1, intervalMs: 1 })
  t.is(ready.length, 1, 'recovered after the transient failure')
})

test('waitForDevice - resolves when the device appears under the worker', async (t) => {
  const transport = fakeTransport((n) => n < 2
    ? { workers: [READY('miner-worker', [])] }
    : { workers: [READY('miner-worker', ['miner-0'])] })
  const client = createMdkClient({ transport })
  await client.connect()

  const got = await client.waitForDevice('miner-0', { workerId: 'miner-worker', intervalMs: 1 })
  t.is(got, true)
})

test('waitForDevice - workerId filter ignores the device under another worker', async (t) => {
  const transport = fakeTransport(() => ({ workers: [READY('other-worker', ['miner-0'])] }))
  const client = createMdkClient({ transport })
  await client.connect()

  await t.exception(() => client.waitForDevice('miner-0', { workerId: 'miner-worker', timeoutMs: 25, intervalMs: 5 }), /ERR_MDK_WAIT_DEVICE_TIMEOUT/)
})

test('waitForDevice - throws ERR_MDK_WAIT_DEVICE_TIMEOUT when never registered', async (t) => {
  const transport = fakeTransport(() => ({ workers: [READY('w1', ['d1'])] }))
  const client = createMdkClient({ transport })
  await client.connect()

  await t.exception(() => client.waitForDevice('ghost', { timeoutMs: 25, intervalMs: 5 }), /ERR_MDK_WAIT_DEVICE_TIMEOUT/)
})
