'use strict'

const test = require('brittle')
const { sweep } = require('../../lib/telemetry')

const ctx = Object.freeze({ deviceId: 'SIM-001', device: { hashrate: 93, power: 3100 } })

function entries (list) {
  return list.map(([name, handler, path]) => ({ name, type: 'number', handler, ...(path ? { path } : {}) }))
}

test('one call per distinct handler, one value per metric by path', async (t) => {
  const calls = []
  const stats = async (c, params) => { calls.push([c.deviceId, params]); return { power: c.device.power, minerData: { hashrate: c.device.hashrate } } }
  const handlers = new Map([['power', stats], ['hashrate_rt', stats]])

  const res = await sweep(ctx, entries([
    ['power', 'src/telemetry/stats.js', 'power'],
    ['hashrate_rt', 'src/telemetry/stats.js', 'minerData.hashrate']
  ]), handlers, { fresh: true })

  t.alike(calls, [['SIM-001', { fresh: true }]])
  t.alike(res, { metrics: { power: 3100, hashrate_rt: 93 }, answered: true, error: null })
})

test('an entry without path takes the whole handler result', async (t) => {
  const handlers = new Map([['hashrate_rt', async (c) => c.device.hashrate], ['temps', async () => ({ board: [60, 61] })]])
  const res = await sweep(ctx, entries([
    ['hashrate_rt', 'src/telemetry/hashrate.js'],
    ['temps', 'src/telemetry/temps.js']
  ]), handlers, {})

  t.alike(res.metrics, { hashrate_rt: 93, temps: { board: [60, 61] } })
  t.is(res.answered, true)
})

test('a path the result does not hold is a per-metric error, not a device failure', async (t) => {
  const handlers = new Map([['power', async () => ({ minerData: {} })], ['hashrate_rt', async () => ({ minerData: {} })]])
  const res = await sweep(ctx, entries([
    ['power', 'src/telemetry/stats.js', 'power'],
    ['hashrate_rt', 'src/telemetry/stats.js', 'minerData.hashrate']
  ]), handlers, {})

  t.alike(res.metrics, {
    power: { error: 'ERR_TELEMETRY_PATH_MISSING: power' },
    hashrate_rt: { error: 'ERR_TELEMETRY_PATH_MISSING: hashrate_rt' }
  })
  t.is(res.answered, true)
  t.is(res.error, null)
})

test('null, 0 and false are values; a path through null or a primitive is missing', async (t) => {
  const handlers = new Map([
    ['pool', async () => ({ pool: null, boards: [{ temp: 0 }], ok: false, name: 'abc' })],
    ['temp0', async () => ({ pool: null, boards: [{ temp: 0 }], ok: false, name: 'abc' })],
    ['ok', async () => ({ pool: null, boards: [{ temp: 0 }], ok: false, name: 'abc' })],
    ['url', async () => ({ pool: null, boards: [{ temp: 0 }], ok: false, name: 'abc' })],
    ['first', async () => ({ pool: null, boards: [{ temp: 0 }], ok: false, name: 'abc' })]
  ])
  const res = await sweep(ctx, entries([
    ['pool', 'src/telemetry/stats.js', 'pool'],
    ['temp0', 'src/telemetry/stats.js', 'boards.0.temp'],
    ['ok', 'src/telemetry/stats.js', 'ok'],
    ['url', 'src/telemetry/stats.js', 'pool.url'],
    ['first', 'src/telemetry/stats.js', 'name.0']
  ]), handlers, {})
  t.alike(res.metrics, {
    pool: null,
    temp0: 0,
    ok: false,
    url: { error: 'ERR_TELEMETRY_PATH_MISSING: url' },
    first: { error: 'ERR_TELEMETRY_PATH_MISSING: first' }
  })
})

test('metrics keep contract order even when handlers are shared out of order', async (t) => {
  const handlers = new Map([['a', async () => ({ x: 1, y: 2 })], ['b', async () => 3], ['c', async () => ({ x: 1, y: 2 })]])
  const res = await sweep(ctx, entries([['a', 'h1.js', 'x'], ['b', 'h2.js'], ['c', 'h1.js', 'y']]), handlers, {})
  t.alike(Object.keys(res.metrics), ['a', 'b', 'c'])
})

test('a plugin without a telemetry section sweeps to nothing', async (t) => {
  t.alike(await sweep(ctx, undefined, new Map(), {}), { metrics: {}, answered: false, error: null })
  t.alike(await sweep(ctx, [], new Map(), {}), { metrics: {}, answered: false, error: null })
})

test('a throwing handler fails every metric it serves; siblings still answer', async (t) => {
  const handlers = new Map([
    ['power', async () => { throw new Error('ERR_DEVICE_TIMEOUT: 10.0.0.1') }],
    ['hashrate_rt', async () => { throw new Error('ERR_DEVICE_TIMEOUT: 10.0.0.1') }],
    ['uptime', async () => 1000]
  ])
  const res = await sweep(ctx, entries([
    ['power', 'src/telemetry/stats.js', 'power'],
    ['hashrate_rt', 'src/telemetry/stats.js', 'minerData.hashrate'],
    ['uptime', 'src/telemetry/uptime.js']
  ]), handlers, {})

  t.alike(res.metrics, {
    power: { error: 'ERR_DEVICE_TIMEOUT: 10.0.0.1' },
    hashrate_rt: { error: 'ERR_DEVICE_TIMEOUT: 10.0.0.1' },
    uptime: 1000
  })
  t.is(res.answered, true)
  t.is(res.error, 'ERR_DEVICE_TIMEOUT: 10.0.0.1')
})

test('when nothing answers, answered is false and non-ERR messages are mapped', async (t) => {
  const handlers = new Map([['power', async () => { throw new Error('ECONNREFUSED 10.0.0.1:4028') }]])
  const res = await sweep(ctx, entries([['power', 'src/telemetry/power.js']]), handlers, {})

  t.alike(res, { metrics: { power: { error: 'ERR_TELEMETRY_FAILED' } }, answered: false, error: 'ERR_TELEMETRY_FAILED' })
})
