'use strict'

// getStatus() shaping + first-request retry, and the opt-in connect warmup —
// hermetic, via the { transport } injection seam (no DHT, no network). The fake
// transport answers WORKER_LIST with whatever its `respond` returns and counts
// calls so we can assert retry/warmup behavior.

const test = require('brittle')
const { createMdkClient } = require('../../index')
const { ACTIONS } = require('../../../ork/lib/protocol/actions')

function fakeTransport (respond) {
  const t = { calls: 0, requests: [] }
  t.connect = async () => {}
  t.close = async () => {}
  t.request = async (envelope) => {
    t.calls++
    t.requests.push(envelope)
    return respond(t.calls, envelope)
  }
  return t
}

test('getStatus - shapes WORKER_LIST into { workers, totalDevices }', async (t) => {
  const transport = fakeTransport(() => ({
    workers: [
      { workerId: 'w1', deviceIds: ['d1', 'd2'], state: 'READY', healthState: 'HEALTHY', rpcKey: 'aa' },
      { workerId: 'w2', deviceIds: ['d3'], state: 'READY', healthState: 'DEGRADED', rpcKey: 'bb' }
    ]
  }))
  const client = createMdkClient({ transport })
  await client.connect()

  const status = await client.getStatus()
  t.is(status.totalDevices, 3, 'sums deviceIds across workers')
  t.is(status.workers.length, 2)
  t.alike(status.workers[0], {
    workerId: 'w1',
    state: 'READY',
    healthState: 'HEALTHY',
    deviceIds: ['d1', 'd2'],
    deviceCount: 2,
    rpcKey: 'aa'
  }, 'first worker fully shaped')
  t.is(status.workers[1].deviceCount, 1)
  t.is(transport.requests[0].action, ACTIONS.WORKER_LIST, 'queried WORKER_LIST')
})

test('getStatus - missing/empty workers yields zero totals', async (t) => {
  const client = createMdkClient({ transport: fakeTransport(() => ({})) })
  await client.connect()
  const status = await client.getStatus()
  t.alike(status, { workers: [], totalDevices: 0 })
})

test('getStatus - retries a transient CHANNEL_CLOSED then succeeds', async (t) => {
  const transport = fakeTransport((n) => {
    if (n === 1) throw new Error('CHANNEL_CLOSED: channel closed')
    return { workers: [{ workerId: 'w1', deviceIds: [], state: 'READY', healthState: 'HEALTHY' }] }
  })
  const client = createMdkClient({ transport })
  await client.connect()

  const status = await client.getStatus({ retryDelayMs: 1 })
  t.is(transport.calls, 2, 'retried once after the transient failure')
  t.is(status.workers.length, 1)
})

test('getStatus - rejects with ERR_MDK_STATUS_TIMEOUT when the request hangs', async (t) => {
  const transport = fakeTransport(() => new Promise(() => {})) // never resolves
  const client = createMdkClient({ transport })
  await client.connect()

  await t.exception(() => client.getStatus({ timeoutMs: 20, retries: 1 }), /ERR_MDK_STATUS_TIMEOUT/)
})

test('getStatus - exhausts retries and throws the last error', async (t) => {
  const transport = fakeTransport(() => { throw new Error('ERR_HRPC_NOT_CONNECTED') })
  const client = createMdkClient({ transport })
  await client.connect()

  await t.exception(() => client.getStatus({ retries: 3, retryDelayMs: 1 }), /ERR_HRPC_NOT_CONNECTED/)
  t.is(transport.calls, 3, 'tried exactly `retries` times')
})

test('connect - no args does not warm up (no requests issued)', async (t) => {
  const transport = fakeTransport(() => ({ workers: [] }))
  const client = createMdkClient({ transport })
  await client.connect()
  t.is(transport.calls, 0, 'plain connect() issues no request — prior behavior')
})

test('connect - warmup issues a best-effort listWorkers and swallows failure', async (t) => {
  let calls = 0
  const transport = fakeTransport(() => { calls++; throw new Error('CHANNEL_CLOSED') })
  const client = createMdkClient({ transport })

  await client.connect({ warmup: true, warmupRetries: 2, warmupDelayMs: 1 }) // must not throw
  t.is(calls, 2, 'warmup retried up to warmupRetries')
})
