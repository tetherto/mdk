'use strict'

const test = require('brittle')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { openTelemetryStore, rollup } = require('../../lib/telemetry')

const TELEMETRY = [{ name: 'hashrate_rt', type: 'number' }, { name: 'status', type: 'string' }]
const MIN = 60000
const NOW = 100 * MIN
const RETENTION = { rawMs: 10 * MIN, rollupIntervalMs: 5 * MIN, keepMs: 60 * MIN }

async function openStore (t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-worker-rollup-'))
  t.teardown(() => fs.rmSync(dir, { recursive: true, force: true }), { order: 1 })
  const store = await openTelemetryStore({ storeDir: dir })
  t.teardown(() => store.close())
  return store
}

// One point a minute from `fromMin` to `toMin` (exclusive): hashrate = minute, status flips.
async function seed (store, deviceId, fromMin, toMin) {
  for (let m = fromMin; m < toMin; m++) {
    await store.put(deviceId, m * MIN, { hashrate_rt: m, status: m % 2 ? 'mining' : 'sleeping' })
  }
}

test('rollup - old points become one point per bucket (mean for numbers, last value otherwise); recent points stay', async (t) => {
  const store = await openStore(t)
  await seed(store, 'a', 70, 100)
  await rollup(store, ['a'], TELEMETRY, RETENTION, new Map(), NOW)

  const points = await store.range('a', 0, NOW)
  const rolled = points.filter((p) => p.ts < 90 * MIN)
  const raw = points.filter((p) => p.ts >= 90 * MIN)
  t.alike(rolled.map((p) => p.ts), [70 * MIN, 75 * MIN, 80 * MIN, 85 * MIN], 'four closed 5m buckets before the 10m raw window')
  t.alike(rolled[0].data, { hashrate_rt: 72, status: 'sleeping' }, 'mean of 70..74, last status of minute 74')
  t.alike(rolled[3].data, { hashrate_rt: 87, status: 'mining' })
  t.is(raw.length, 10, 'minutes 90..99 untouched')
  t.alike(raw[0].data, { hashrate_rt: 90, status: 'sleeping' })
})

test('rollup - a second run leaves rolled points alone and expires points older than keepMs', async (t) => {
  const store = await openStore(t)
  await seed(store, 'a', 30, 100)
  const cursors = new Map()
  await rollup(store, ['a'], TELEMETRY, RETENTION, cursors, NOW)
  const once = await store.range('a', 0, NOW)
  await rollup(store, ['a'], TELEMETRY, RETENTION, cursors, NOW)
  t.alike(await store.range('a', 0, NOW), once, 'idempotent')
  await rollup(store, ['a'], TELEMETRY, RETENTION, new Map(), NOW)
  t.alike(await store.range('a', 0, NOW), once, 'idempotent after a restart too')

  t.is(once[0].ts, 40 * MIN, 'minutes before now - keepMs are gone')
  t.alike(once.filter((p) => p.ts < 90 * MIN).map((p) => p.ts), [40, 45, 50, 55, 60, 65, 70, 75, 80, 85].map((m) => m * MIN))

  await rollup(store, ['a'], TELEMETRY, RETENTION, cursors, NOW + 10 * MIN)
  const later = await store.range('a', 0, NOW + 10 * MIN)
  t.is(later[0].ts, 50 * MIN, 'rolled points expire too')
  t.alike(later.filter((p) => p.ts >= 90 * MIN && p.ts < 100 * MIN).map((p) => p.ts), [90 * MIN, 95 * MIN], 'the next closed buckets rolled')
})

test('rollup - an errored metric is skipped by the mean and kept as the last marker when nothing else is there', async (t) => {
  const store = await openStore(t)
  await store.put('a', 70 * MIN, { hashrate_rt: 10, status: 'mining' })
  await store.put('a', 71 * MIN, { hashrate_rt: { error: 'ERR_TELEMETRY_FAILED' }, status: { error: 'ERR_TELEMETRY_FAILED' } })
  await store.put('a', 72 * MIN, { hashrate_rt: 20, status: 'sleeping' })
  await store.put('a', 76 * MIN, { hashrate_rt: { error: 'ERR_TELEMETRY_FAILED' }, status: 'mining' })
  await store.put('a', 77 * MIN, { hashrate_rt: { error: 'ERR_DEVICE_TIMEOUT: late' }, status: 'mining' })
  await store.put('a', 80 * MIN, { hashrate_rt: NaN, status: 'mining' })
  await store.put('a', 81 * MIN, { hashrate_rt: 'n/a', status: 'mining' })
  await store.put('a', 82 * MIN, { hashrate_rt: 4, status: 'mining' })
  await store.put('a', 86 * MIN, { hashrate_rt: { error: 'ERR_TELEMETRY_FAILED' }, status: { error: 'ERR_TELEMETRY_FAILED' } })
  await store.put('a', 87 * MIN, { hashrate_rt: { error: 'ERR_DEVICE_TIMEOUT: late' }, status: { error: 'ERR_DEVICE_TIMEOUT: late' } })
  await rollup(store, ['a'], TELEMETRY, RETENTION, new Map(), NOW)
  const [first, second, third, fourth] = await store.range('a', 0, NOW)
  t.alike(first.data, { hashrate_rt: 15, status: 'sleeping' })
  t.is(first.n, 2, 'a sweep that read nothing is not counted')
  t.alike(second.data, { hashrate_rt: { error: 'ERR_DEVICE_TIMEOUT: late' }, status: 'mining' }, 'the last marker is kept')
  t.alike(third.data, { hashrate_rt: 4, status: 'mining' }, 'NaN and non-number readings never enter the mean')
  t.is(third.n, 3)
  t.alike(fourth.data, { hashrate_rt: { error: 'ERR_DEVICE_TIMEOUT: late' }, status: { error: 'ERR_DEVICE_TIMEOUT: late' } }, 'a bucket of failed sweeps keeps the last markers')
  t.is(fourth.n, 2, 'and counts the sweeps so it is never rolled again')
})

test('rollup - a rolled mean carries no float noise', async (t) => {
  const store = await openStore(t)
  for (let i = 0; i < 5; i++) await store.put('a', 70 * MIN + i * MIN, { hashrate_rt: 0.1 })
  await store.put('a', 75 * MIN, { hashrate_rt: 0.1 })
  await store.put('a', 76 * MIN, { hashrate_rt: 0.2 })
  await rollup(store, ['a'], TELEMETRY, RETENTION, new Map(), NOW)
  const [first, second] = await store.range('a', 0, NOW)
  t.is(first.data.hashrate_rt, 0.1, 'five readings of 0.1 average to 0.1, not 0.10000000000000002')
  t.is(second.data.hashrate_rt, 0.15, '0.1 and 0.2 average to 0.15')
})

test('rollup - a bucket straddling the raw window waits for the next pass; compaction reclaims deleted blocks', async (t) => {
  const store = await openStore(t)
  await seed(store, 'a', 70, 100)
  const seqs = []
  for await (const { seq, key } of store.bee.createReadStream()) if (key.startsWith('a')) seqs.push(seq)
  await rollup(store, ['a'], TELEMETRY, RETENTION, new Map(), 102 * MIN)
  const raw = (await store.range('a', 0, 102 * MIN)).filter((p) => !p.n).map((p) => p.ts / MIN)
  t.alike(raw.slice(0, 2), [90, 91], 'minutes 90 and 91 sit in the open 90..95 bucket')
  await rollup(store, ['a'], TELEMETRY, RETENTION, new Map(), 102 * MIN)
  t.ok(seqs.length >= 30)
  t.is(await store.bee.core.has(seqs[0]), false, 'the block of a rolled-up raw point is gone from disk')
  t.is(await store.bee.core.has(seqs[seqs.length - 1]), true, 'a live raw point keeps its block')
})

test('rollup - devices are independent and a device with nothing old is untouched', async (t) => {
  const store = await openStore(t)
  await seed(store, 'a', 70, 100)
  await seed(store, 'b', 95, 100)
  await rollup(store, ['a', 'b'], TELEMETRY, RETENTION, new Map(), NOW)
  t.is((await store.range('b', 0, NOW)).length, 5)
  t.is((await store.range('a', 0, NOW)).length, 14)
})
