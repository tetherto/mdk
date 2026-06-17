'use strict'

// waitForDiscovery option handling and back-compat — pure unit, no network: a
// fake ork exposes a mutable registry.listWorkers() we drive from the test.

const test = require('brittle')
const { waitForDiscovery } = require('../../index')

function fakeOrk (initial = []) {
  const state = { workers: initial }
  return {
    registry: { listWorkers: () => state.workers },
    _set: (w) => { state.workers = w }
  }
}

const READY = (workerId, deviceIds) => ({ workerId, state: 'READY', deviceIds })

test('waitForDiscovery - resolves once minWorkers are READY with devices', async (t) => {
  const ork = fakeOrk([READY('w1', ['d1']), READY('w2', ['d2'])])
  const workers = await waitForDiscovery(ork, { minWorkers: 2, intervalMs: 1, timeoutMs: 1000 })
  t.is(workers.length, 2)
})

test('waitForDiscovery - becomes ready after a later poll', async (t) => {
  const ork = fakeOrk([])
  setTimeout(() => ork._set([READY('w1', ['d1'])]), 15)
  const workers = await waitForDiscovery(ork, { intervalMs: 5, timeoutMs: 1000 })
  t.is(workers.length, 1)
})

test('waitForDiscovery - positional number is still the timeout (back-compat)', async (t) => {
  const ork = fakeOrk([]) // never satisfies
  const start = Date.now()
  const workers = await waitForDiscovery(ork, 40)
  t.ok(Date.now() - start >= 40, 'waited the positional timeout')
  t.is(workers.length, 0, 'returns the current list on timeout')
})

test('waitForDiscovery - minWorkers unmet waits out the timeout', async (t) => {
  const ork = fakeOrk([READY('w1', ['d1'])])
  const workers = await waitForDiscovery(ork, { minWorkers: 2, timeoutMs: 40, intervalMs: 5 })
  t.is(workers.length, 1, 'returns the current (unfiltered) list on timeout')
})

test('waitForDiscovery - requireDevices:false counts deviceless READY workers', async (t) => {
  const ork = fakeOrk([READY('w1', [])])
  const start = Date.now()
  await waitForDiscovery(ork, { requireDevices: false, timeoutMs: 500, intervalMs: 1 })
  t.ok(Date.now() - start < 200, 'resolved promptly, did not wait out the timeout')
})

test('waitForDiscovery - default requireDevices waits out a deviceless worker', async (t) => {
  const ork = fakeOrk([READY('w1', [])])
  const start = Date.now()
  await waitForDiscovery(ork, { timeoutMs: 40, intervalMs: 5 })
  t.ok(Date.now() - start >= 40, 'waited the full timeout (deviceless worker never satisfies)')
})
