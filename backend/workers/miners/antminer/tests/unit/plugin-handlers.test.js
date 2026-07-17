'use strict'

const test = require('brittle')
const { STATUS, POWER_MODE } = require('../../../../../core/mdk').constants
const efficiency = require('../../plugin/src/telemetry/efficiency')
const status = require('../../plugin/src/telemetry/status')
const hashrateAvg = require('../../plugin/src/telemetry/hashrate-avg')
const temperature = require('../../plugin/src/telemetry/temperature')
const acceptedShares = require('../../plugin/src/telemetry/accepted-shares')
const rejectedShares = require('../../plugin/src/telemetry/rejected-shares')
const powerMode = require('../../plugin/src/telemetry/power-mode')
const setupPools = require('../../plugin/src/commands/setup-pools')

function ctxWith (device) {
  device.fetchDeviceData = async (fn) => fn.call(device)
  return { device }
}

test('efficiency computes W/THs from power and hashrate', async (t) => {
  const ctx = ctxWith({
    getPowerValue: async () => ({ power: 3000 }),
    getSummary: async () => ({ mhs_av: 100000000 })
  })
  t.is(await efficiency(ctx), 30)
})

test('efficiency returns 0 when power is unavailable', async (t) => {
  const ctx = ctxWith({
    getPowerValue: async () => ({ power: undefined }),
    getSummary: async () => ({ mhs_av: 100000000 })
  })
  t.is(await efficiency(ctx), 0)
})

test('efficiency returns 0 when hashrate is 0', async (t) => {
  const ctx = ctxWith({
    getPowerValue: async () => ({ power: 3000 }),
    getSummary: async () => ({ mhs_av: 0 })
  })
  t.is(await efficiency(ctx), 0)
})

test('status returns ERROR when device reports errors', async (t) => {
  const ctx = ctxWith({
    getErrors: async () => ({ errors: [{ name: 'low_temp_protection' }] })
  })
  t.is(await status(ctx), STATUS.ERROR)
})

test('status returns MINING for minerMode 0 without errors', async (t) => {
  const ctx = ctxWith({
    getErrors: async () => ({ errors: [] }),
    getMinerStats: async () => ({ minerMode: 0 })
  })
  t.is(await status(ctx), STATUS.MINING)
})

test('status returns SLEEPING for minerMode 1 even when errors are malformed', async (t) => {
  const ctx = ctxWith({
    getErrors: async () => undefined,
    getMinerStats: async () => ({ minerMode: 1 })
  })
  t.is(await status(ctx), STATUS.SLEEPING)
})

test('hashrate-avg converts MH/s to TH/s', async (t) => {
  const ctx = ctxWith({ getSummary: async () => ({ mhs_av: 123456789 }) })
  t.is(await hashrateAvg(ctx), 123.45)
})

test('hashrate-avg returns 0 for unparseable summary', async (t) => {
  const ctx = ctxWith({ getSummary: async () => ({ mhs_av: 'n/a' }) })
  t.is(await hashrateAvg(ctx), 0)
})

test('temperature returns max board outlet temp ignoring NaN', async (t) => {
  const ctx = ctxWith({
    getMinerStats: async () => ({
      boards: [
        { temp: { outlet: 61 } },
        { temp: { outlet: 'bad' } },
        { temp: { outlet: 72 } }
      ]
    })
  })
  t.is(await temperature(ctx), 72)
})

test('temperature returns 0 when no boards report outlet temps', async (t) => {
  const ctx = ctxWith({ getMinerStats: async () => ({}) })
  t.is(await temperature(ctx), 0)
})

test('accepted-shares sums pool accepted counts', async (t) => {
  const ctx = ctxWith({
    getPools: async () => [{ accepted: '5' }, { accepted: 'bad' }, { accepted: 3 }]
  })
  t.is(await acceptedShares(ctx), 8)
})

test('accepted-shares returns 0 when pools are missing', async (t) => {
  const ctx = ctxWith({ getPools: async () => null })
  t.is(await acceptedShares(ctx), 0)
})

test('rejected-shares sums pool rejected counts', async (t) => {
  const ctx = ctxWith({
    getPools: async () => [{ rejected: '2' }, { rejected: 4 }, { rejected: undefined }]
  })
  t.is(await rejectedShares(ctx), 6)
})

test('rejected-shares returns 0 when pools are missing', async (t) => {
  const ctx = ctxWith({ getPools: async () => null })
  t.is(await rejectedShares(ctx), 0)
})

test('power-mode maps minerMode to POWER_MODE', async (t) => {
  const sleeping = ctxWith({ getMinerStats: async () => ({ minerMode: 1 }) })
  t.is(await powerMode(sleeping), POWER_MODE.SLEEP)
  const normal = ctxWith({ getMinerStats: async () => ({ minerMode: 0 }) })
  t.is(await powerMode(normal), POWER_MODE.NORMAL)
})

test('setup-pools forwards explicit pools with appendId flag', async (t) => {
  const calls = []
  const ctx = {
    device: {
      setPools: async (pools, appendId) => {
        calls.push([pools, appendId])
        return { success: true }
      }
    }
  }
  const pools = [{ url: 'stratum+tcp://p1:3333', worker_name: 'w' }]
  t.alike(await setupPools(ctx, { pools, appendId: false }), { success: true })
  t.alike(await setupPools(ctx, { pools }), { success: true })
  t.alike(calls[0], [pools, false])
  t.alike(calls[1], [pools, true])
})

test('setup-pools falls back to configured pools when none provided', async (t) => {
  let called = false
  const ctx = {
    device: {
      setupPools: async () => {
        called = true
        return { success: true }
      }
    }
  }
  t.alike(await setupPools(ctx, {}), { success: true })
  t.is(called, true)
})
