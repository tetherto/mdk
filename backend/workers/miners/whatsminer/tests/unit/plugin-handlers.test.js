'use strict'

const test = require('brittle')
const { STATUS, POWER_MODE } = require('../../../../../core/mdk').constants

const status = require('../../plugin/src/telemetry/status')
const temperature = require('../../plugin/src/telemetry/temperature')
const uptime = require('../../plugin/src/telemetry/uptime')
const hashrateRt = require('../../plugin/src/telemetry/hashrate-rt')
const hashrateAvg = require('../../plugin/src/telemetry/hashrate-avg')
const power = require('../../plugin/src/telemetry/power')
const powerMode = require('../../plugin/src/telemetry/power-mode')
const poolUrl = require('../../plugin/src/telemetry/pool-url')
const efficiency = require('../../plugin/src/telemetry/efficiency')
const fanSpeedIn = require('../../plugin/src/telemetry/fan-speed-in')
const fanSpeedOut = require('../../plugin/src/telemetry/fan-speed-out')
const acceptedShares = require('../../plugin/src/telemetry/accepted-shares')
const rejectedShares = require('../../plugin/src/telemetry/rejected-shares')
const snap = require('../../plugin/src/telemetry/snap')
const setUpfreqSpeed = require('../../plugin/src/commands/set-upfreq-speed')
const setupPools = require('../../plugin/src/commands/setup-pools')

function makeCtx ({ stats = {}, errors = [], pools = [] } = {}) {
  const device = {
    fetchDeviceData: (fn) => fn(),
    getMinerStats: async () => stats,
    getErrors: async () => errors,
    getPools: async () => pools,
    getSnap: async () => ({ success: true, stats: { status: 'mining' } })
  }
  return { device }
}

test('telemetry/status - error, mining and sleeping states', async (t) => {
  t.is(await status(makeCtx({ errors: [{ code: '203' }] })), STATUS.ERROR)
  t.is(await status(makeCtx({ stats: { mhs_av: '295000000' } })), STATUS.MINING)
  t.is(await status(makeCtx({ stats: { mhs_av: '0' } })), STATUS.SLEEPING)
  t.is(await status(makeCtx({ errors: undefined, stats: { mhs_av: undefined } })), STATUS.SLEEPING)
})

test('telemetry/temperature - parses value with zero fallback', async (t) => {
  t.is(await temperature(makeCtx({ stats: { temperature: '68.5' } })), 68.5)
  t.is(await temperature(makeCtx({ stats: {} })), 0)
})

test('telemetry/uptime - prefers uptime, falls back to elapsed then zero', async (t) => {
  t.is(await uptime(makeCtx({ stats: { uptime: '500', elapsed: '100' } })), 500)
  t.is(await uptime(makeCtx({ stats: { uptime: '0', elapsed: '100' } })), 100)
  t.is(await uptime(makeCtx({ stats: {} })), 0)
})

test('telemetry/hashrate-rt - converts MHS to THS floored', async (t) => {
  t.is(await hashrateRt(makeCtx({ stats: { hs_rt: '295123456' } })), 295.12)
  t.is(await hashrateRt(makeCtx({ stats: {} })), 0)
})

test('telemetry/hashrate-avg - converts MHS to THS floored', async (t) => {
  t.is(await hashrateAvg(makeCtx({ stats: { mhs_av: '295123456' } })), 295.12)
  t.is(await hashrateAvg(makeCtx({ stats: {} })), 0)
})

test('telemetry/power - floors watts with zero fallback', async (t) => {
  t.is(await power(makeCtx({ stats: { power: '3456.789' } })), 3456.78)
  t.is(await power(makeCtx({ stats: {} })), 0)
})

test('telemetry/power-mode - sleep when idle, lowercased mode otherwise', async (t) => {
  t.is(await powerMode(makeCtx({ stats: { mhs_av: '0', power_mode: 'Normal' } })), POWER_MODE.SLEEP)
  t.is(await powerMode(makeCtx({ stats: { mhs_av: '295000000', power_mode: 'High' } })), 'high')
  t.is(await powerMode(makeCtx({ stats: { mhs_av: '295000000' } })), undefined)
})

test('telemetry/pool-url - first pool url with empty fallback', async (t) => {
  t.is(await poolUrl(makeCtx({ pools: [{ url: 'stratum+tcp://p1:1' }] })), 'stratum+tcp://p1:1')
  t.is(await poolUrl(makeCtx({ pools: [] })), '')
})

test('telemetry/efficiency - floors power rate with zero fallback', async (t) => {
  t.is(await efficiency(makeCtx({ stats: { power_rate: '30.059' } })), 30.05)
  t.is(await efficiency(makeCtx({ stats: {} })), 0)
})

test('telemetry/fan speeds - parse with zero fallback', async (t) => {
  t.is(await fanSpeedIn(makeCtx({ stats: { fan_speed_in: '4500' } })), 4500)
  t.is(await fanSpeedIn(makeCtx({ stats: {} })), 0)
  t.is(await fanSpeedOut(makeCtx({ stats: { fan_speed_out: '4620' } })), 4620)
  t.is(await fanSpeedOut(makeCtx({ stats: {} })), 0)
})

test('telemetry/shares - parse integers with zero fallback', async (t) => {
  t.is(await acceptedShares(makeCtx({ stats: { accepted: '42' } })), 42)
  t.is(await acceptedShares(makeCtx({ stats: {} })), 0)
  t.is(await rejectedShares(makeCtx({ stats: { rejected: '7' } })), 7)
  t.is(await rejectedShares(makeCtx({ stats: {} })), 0)
})

test('telemetry/snap - delegates to device.getSnap', async (t) => {
  t.alike(await snap(makeCtx()), { success: true, stats: { status: 'mining' } })
})

test('commands/set-upfreq-speed - delegates speed to device', async (t) => {
  const calls = []
  const ctx = { device: { setUpfreqSpeed: async (speed) => { calls.push(speed); return { success: true } } } }
  t.alike(await setUpfreqSpeed(ctx, { speed: 5 }), { success: true })
  t.alike(calls, [5])
})

test('commands/setup-pools - explicit pools honour appendId flag', async (t) => {
  const calls = []
  const ctx = {
    device: {
      setPools: async (pools, appendId) => { calls.push({ pools, appendId }); return { success: true } },
      setupPools: async () => ({ success: true, fromConf: true })
    }
  }
  const pools = [{ url: 'stratum+tcp://p1:1', worker_name: 'w1' }]
  t.alike(await setupPools(ctx, { pools }), { success: true })
  t.alike(await setupPools(ctx, { pools, appendId: false }), { success: true })
  t.is(calls[0].appendId, true)
  t.is(calls[1].appendId, false)
})

test('commands/setup-pools - falls back to configured pools', async (t) => {
  const ctx = {
    device: {
      setPools: async () => { throw new Error('ERR_UNEXPECTED_CALL') },
      setupPools: async () => ({ success: true, fromConf: true })
    }
  }
  t.alike(await setupPools(ctx, {}), { success: true, fromConf: true })
  t.alike(await setupPools(ctx, { pools: [] }), { success: true, fromConf: true })
})
