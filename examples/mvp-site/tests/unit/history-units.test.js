'use strict'

// The `unit` a /site/history response carries is what a caller reading the API
// directly has to go on — the example's own UI never reads it, so a wrong label
// is invisible from the browser. These lock each metric's unit to the series the
// branch actually returns, in both the empty and the populated case.
//
// The pool metric is the one that was wrong: pool stats-history values are H/s,
// the unit f2pool's in-repo contract and the installed Ocean and SpiderPool
// contracts all declare, and the route passes them through unconverted.

const test = require('brittle')
const { execFileSync } = require('node:child_process')
const path = require('node:path')

const exampleDir = path.join(__dirname, '..', '..')

// The controllers read config/site.deploy.json at load — seed local config
// from the *.example files first (no-op when it already exists).
execFileSync('node', [path.join(exampleDir, 'deploy', 'setup-config.js')])

const controller = require('../../backend/gateway-plugins/site/controllers/history')

// QA read this off a running site and called it TH/s because the route said so.
// It is H/s: about 786 TH/s, a plausible pool-side total for the example.
const POOL_HASHRATE_HS = 785642000000000
const TS = 1763500000000

const POOL_WORKER = { workerId: 'f2pool-worker', deviceFamily: 'minerpool', deviceIds: ['POOL-1'] }
const MINER_WORKER = { workerId: 'whatsminer-worker', deviceFamily: 'miner', deviceIds: ['M-1'] }
const METER_WORKER = { workerId: 'abb-worker', deviceFamily: 'power-meter', deviceIds: ['PM-1'] }
const SENSOR_WORKER = { workerId: 'seneca-worker', deviceFamily: 'sensor', deviceIds: ['S-1'] }

const noDevices = { listWorkers: async () => ({ workers: [] }) }

// One worker, one device, answering the tail-log pull with `snap`.
const withThing = (worker, deviceId, stats, info = {}) => ({
  listWorkers: async () => ({ workers: [worker] }),
  pullWorkerQuery: async () => ({
    workers: { [worker.workerId]: { things: [{ id: deviceId, info, last: { snap: { stats } } }] } }
  }),
  pullTelemetry: async () => ({ logs: [{ ts: TS, snap: { stats } }] })
})

// A pool worker serving its persisted stats series as ext_data 'stats-history'.
const withPoolHistory = (hashrate) => ({
  listWorkers: async () => ({ workers: [POOL_WORKER] }),
  pullTelemetry: async (deviceId, query) => (
    query.type === 'ext_data' && query.key === 'stats-history'
      ? { extData: [{ ts: TS, stats: [{ hashrate }] }] }
      : null
  )
})

const history = (metric, mdkClient) => controller({ query: { metric } }, { mdkClient })

// [metric, unit, a client with devices, a client without]
const METRICS = [
  ['hashrate', 'H/s', withPoolHistory(POOL_HASHRATE_HS), noDevices],
  ['site-hashrate', 'MH/s', withThing(MINER_WORKER, 'M-1', { hashrate_mhs: { t_5m: 110000 } }), noDevices],
  ['power', 'W', withThing(METER_WORKER, 'PM-1', { power_w: 4200 }, { pos: 'site' }), noDevices],
  ['temperature', '°C', withThing(SENSOR_WORKER, 'S-1', { temp_c: 31.5 }), noDevices]
]

test('history units - every metric labels both its branches the same', async (t) => {
  for (const [metric, unit, populated, empty] of METRICS) {
    const withData = await history(metric, populated)
    t.is(withData.unit, unit, `${metric} populated`)
    t.ok(withData.log.length, `${metric} returns a series to label`)

    const withNone = await history(metric, empty)
    t.is(withNone.unit, unit, `${metric} empty`)
    t.is(withNone.log.length, 0, `${metric} empty log`)
  }
})

test('history units - pool hashrate is the contracts\' H/s, passed through unconverted', async (t) => {
  const res = await history('hashrate', withPoolHistory(POOL_HASHRATE_HS))

  t.is(res.unit, 'H/s')
  // Unconverted: the value the pool worker stored is the value the route returns.
  // A TH/s label would mean this number is 7.9e14 TH/s, ~6 orders past the planet.
  t.is(res.log[0].value, POOL_HASHRATE_HS)
})

test('history units - a metric the route does not serve is refused, inherited names included', async (t) => {
  // The unit table doubles as the metric list. Were it an object looked up
  // without a guard, anything Object.prototype answers to would pass as a
  // known metric and fall through to the hashrate branch.
  for (const metric of ['nope', 'constructor', 'toString', '__proto__', 'hasOwnProperty']) {
    await t.exception(history(metric, noDevices), /ERR_UNKNOWN_METRIC/, metric)
  }
})

test('history units - pool hashrate sums the pools in the series own unit', async (t) => {
  const twoPools = {
    listWorkers: async () => ({
      workers: [POOL_WORKER, { workerId: 'ocean-pool-worker', deviceFamily: 'minerpool', deviceIds: ['POOL-2'] }]
    }),
    pullTelemetry: async (deviceId, query) => (
      query.type === 'ext_data' && query.key === 'stats-history'
        ? { extData: [{ ts: TS, stats: [{ hashrate: POOL_HASHRATE_HS }] }] }
        : null
    )
  }

  const res = await history('hashrate', twoPools)

  t.is(res.unit, 'H/s')
  t.is(res.log[0].value, POOL_HASHRATE_HS * 2, 'both pools summed, neither rescaled')
})
