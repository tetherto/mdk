'use strict'

const test = require('brittle')
const { snapshot } = require('../../lib/telemetry')

// In-memory stand-in for the telemetry store: points per device, ascending ts.
function fakeStore (series) {
  return {
    async latest (deviceId) {
      const points = series[deviceId] || []
      return points.length ? points[points.length - 1] : null
    },
    async range (deviceId, from, to) {
      return (series[deviceId] || []).filter((p) => p.ts >= from && p.ts <= to)
    }
  }
}

function every5s (count, deviceId = 'a') {
  const points = []
  for (let i = 0; i < count; i++) points.push({ ts: i * 5000, data: { hashrate_rt: i, power: i * 10 } })
  return { [deviceId]: points }
}

test('read - latest point per device, metrics filter, empty device', async (t) => {
  const store = fakeStore({ ...every5s(3), b: [] })
  t.alike(await snapshot(store, ['a', 'b'], {}), {
    devices: { a: { ts: 10000, metrics: { hashrate_rt: { value: 2 }, power: { value: 20 } } }, b: { ts: null, metrics: {} } },
    snapshotTs: 10000
  })
  t.alike((await snapshot(store, ['a'], { metrics: ['power'] })).devices.a.metrics, { power: { value: 20 } })
})

test('read - a range without granularity returns every stored point', async (t) => {
  const store = fakeStore(every5s(7))
  const res = await snapshot(store, ['a'], { from: 5000, to: 15000 })
  t.alike(res.devices.a, {
    ts: 15000,
    metrics: {
      hashrate_rt: { points: [{ ts: 5000, value: 1 }, { ts: 10000, value: 2 }, { ts: 15000, value: 3 }] },
      power: { points: [{ ts: 5000, value: 10 }, { ts: 10000, value: 20 }, { ts: 15000, value: 30 }] }
    }
  })
  t.alike({ from: res.from, to: res.to, snapshotTs: res.snapshotTs }, { from: 5000, to: 15000, snapshotTs: 15000 })
})

test('read - granularity samples the nearest stored reading per step (5s store, 7s request)', async (t) => {
  const store = fakeStore(every5s(7))
  const res = await snapshot(store, ['a'], { from: 0, to: 30000, granularity: '7s', metrics: ['hashrate_rt'] })
  t.alike(res.devices.a.metrics.hashrate_rt.points.map((p) => p.ts), [0, 5000, 15000, 20000, 30000])
  t.is(res.granularity, 7000)
  const ms = await snapshot(store, ['a'], { from: 0, to: 30000, granularity: 7000, metrics: ['hashrate_rt'] })
  t.alike(ms.devices.a.metrics.hashrate_rt.points, res.devices.a.metrics.hashrate_rt.points)
})

test('read - ties go to the earlier reading and a reading is never repeated', async (t) => {
  const store = fakeStore({ a: [{ ts: 0, data: { v: 'x' } }, { ts: 10000, data: { v: 'y' } }, { ts: 20000, data: { v: 'z' } }, { ts: 100000, data: { v: 'w' } }] })
  const tie = await snapshot(store, ['a'], { from: 0, to: 20000, granularity: '5s' })
  t.alike(tie.devices.a.metrics.v.points, [{ ts: 0, value: 'x' }, { ts: 10000, value: 'y' }, { ts: 20000, value: 'z' }])
  const sparse = await snapshot(store, ['a'], { from: 0, to: 100000, granularity: '10s' })
  t.alike(sparse.devices.a.metrics.v.points.map((p) => p.ts), [0, 10000, 20000, 100000])
  const offset = await snapshot(store, ['a'], { from: 3000, to: 30000, granularity: '10s' })
  t.alike(offset.devices.a.metrics.v.points.map((p) => p.ts), [10000, 20000], 'samples start at from; only readings inside the range are candidates')
})

test('read - a stored error marker is returned as-is, never wrapped as a value', async (t) => {
  const store = fakeStore({ a: [{ ts: 1000, data: { v: 1, w: { error: 'ERR_TELEMETRY_FAILED' } } }] })
  t.alike((await snapshot(store, ['a'], {})).devices.a.metrics, { v: { value: 1 }, w: { error: 'ERR_TELEMETRY_FAILED' } })
  t.alike((await snapshot(store, ['a'], { from: 0 })).devices.a.metrics.w.points, [{ ts: 1000, error: 'ERR_TELEMETRY_FAILED' }])
})

test('read - a point without the metric is skipped for that series; to defaults to now', async (t) => {
  const store = fakeStore({ a: [{ ts: 1000, data: { v: 1 } }, { ts: 2000, data: { w: 2 } }, { ts: 3000, data: { v: 3 } }] })
  const res = await snapshot(store, ['a'], { from: 0 })
  t.alike(res.devices.a.metrics, { v: { points: [{ ts: 1000, value: 1 }, { ts: 3000, value: 3 }] }, w: { points: [{ ts: 2000, value: 2 }] } })
  t.ok(res.to >= Date.now() - 1000)
})

test('read - invalid ranges and granularities are refused', async (t) => {
  const store = fakeStore(every5s(2))
  t.alike(await snapshot(store, ['a'], { from: 'yesterday' }), { error: 'ERR_RANGE_INVALID: from yesterday' })
  t.alike(await snapshot(store, ['a'], { from: 5000, to: 1000 }), { error: 'ERR_RANGE_INVALID: to 1000 before from 5000' })
  t.alike(await snapshot(store, ['a'], { from: 0, granularity: 'fast' }), { error: 'ERR_GRANULARITY_INVALID: fast' })
  t.alike(await snapshot(store, ['a'], { from: 0, granularity: 0 }), { error: 'ERR_GRANULARITY_INVALID: 0' })
  t.alike(await snapshot(store, ['a'], { granularity: '1m' }), { error: 'ERR_RANGE_INVALID: granularity needs from' })
})

// A step below a millisecond is smaller than the gap between two adjacent
// doubles at an epoch timestamp, so walking the range by adding it never
// advances. Sampling used to run that walk synchronously, so the Worker
// stopped answering requests and polling devices until it was restarted, and
// a request timeout could not interrupt it.
test('read - a granularity too small to advance an epoch timestamp is refused', async (t) => {
  const now = 1700000000000
  const store = fakeStore({ a: [{ ts: now, data: { v: 1 } }] })
  for (const granularity of [0.000001, 0.5, -0.000001]) {
    t.alike(await snapshot(store, ['a'], { from: now, to: now + 1000, granularity }),
      { error: `ERR_GRANULARITY_INVALID: ${granularity}` }, `${granularity} refused`)
  }
})

test('read - a range asking for more sample steps than the cap is refused', async (t) => {
  const store = fakeStore(every5s(2))
  t.alike(await snapshot(store, ['a'], { from: 0, to: 100000001, granularity: 1 }),
    { error: 'ERR_GRANULARITY_TOO_FINE: 1 over 100000001ms asks for more than 100000 steps' })
  // The cap itself still samples.
  const ok = await snapshot(store, ['a'], { from: 0, to: 100000, granularity: 1, metrics: ['hashrate_rt'] })
  t.absent(ok.error, 'exactly at the cap is allowed')
})

test('read - a rolled-up point carries n, a raw point does not', async (t) => {
  const store = fakeStore({ a: [{ ts: 0, data: { v: 1 }, n: 5 }, { ts: 1000, data: { v: 2 } }] })
  t.alike((await snapshot(store, ['a'], { from: 0 })).devices.a.metrics.v.points, [{ ts: 0, n: 5, value: 1 }, { ts: 1000, value: 2 }])
  const rolledOnly = fakeStore({ a: [{ ts: 0, data: { v: 1 }, n: 5 }] })
  t.alike((await snapshot(rolledOnly, ['a'], {})).devices.a, { ts: 0, n: 5, metrics: { v: { value: 1 } } })
})
