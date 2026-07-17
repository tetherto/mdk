'use strict'

const test = require('brittle')
const readStats = require('../../plugin/src/read-stats')
const voltageV1 = require('../../plugin/src/telemetry/voltage-v1')
const voltageV2 = require('../../plugin/src/telemetry/voltage-v2')
const voltageV3 = require('../../plugin/src/telemetry/voltage-v3')
const currentI1 = require('../../plugin/src/telemetry/current-i1')
const currentI2 = require('../../plugin/src/telemetry/current-i2')
const currentI3 = require('../../plugin/src/telemetry/current-i3')
const activePower = require('../../plugin/src/telemetry/active-power')
const reactivePower = require('../../plugin/src/telemetry/reactive-power')

function ctxWithStats (stats) {
  return {
    device: {
      cache: Buffer.alloc(1),
      async getRealtimeData () {
        return { success: true, stats }
      }
    }
  }
}

test('readStats does a live getSnap when the device cache is empty', async t => {
  let snapCalls = 0
  const ctx = {
    device: {
      cache: null,
      async getSnap () {
        snapCalls++
        return { success: true, stats: { power_w: 42 } }
      }
    }
  }

  t.alike(await readStats(ctx), { power_w: 42 })
  t.is(snapCalls, 1)
})

test('readStats reads from cache once populated', async t => {
  const ctx = ctxWithStats({ power_w: 7 })
  t.alike(await readStats(ctx), { power_w: 7 })
})

test('readStats returns empty stats when the snap has none', async t => {
  const ctx = {
    device: {
      cache: Buffer.alloc(1),
      async getRealtimeData () {
        return null
      }
    }
  }
  t.alike(await readStats(ctx), {})
})

test('voltage channels read per-phase values', async t => {
  const ctx = ctxWithStats({
    powermeter_specific: { v1_n_v: 231, v2_n_v: 232, v3_n_v: 233 }
  })

  t.is(await voltageV1(ctx), 231)
  t.is(await voltageV2(ctx), 232)
  t.is(await voltageV3(ctx), 233)
})

test('voltage_v1 falls back to voltage_v for single-voltage models', async t => {
  const ctx = ctxWithStats({ voltage_v: 400 })
  t.is(await voltageV1(ctx), 400)
})

test('voltage channels default to 0 without powermeter_specific', async t => {
  const ctx = ctxWithStats({})
  t.is(await voltageV1(ctx), 0)
  t.is(await voltageV2(ctx), 0)
  t.is(await voltageV3(ctx), 0)
})

test('current channels read per-phase values', async t => {
  const ctx = ctxWithStats({
    powermeter_specific: { i1_a: 15, i2_a: 16, i3_a: 17 }
  })

  t.is(await currentI1(ctx), 15)
  t.is(await currentI2(ctx), 16)
  t.is(await currentI3(ctx), 17)
})

test('current channels default to 0 without powermeter_specific', async t => {
  const ctx = ctxWithStats({})
  t.is(await currentI1(ctx), 0)
  t.is(await currentI2(ctx), 0)
  t.is(await currentI3(ctx), 0)
})

test('power channels read totals and default to 0', async t => {
  const withValues = ctxWithStats({
    power_w: 5000,
    powermeter_specific: { reactive_power_total_var: -2000 }
  })
  t.is(await activePower(withValues), 5000)
  t.is(await reactivePower(withValues), -2000)

  const empty = ctxWithStats({})
  t.is(await activePower(empty), 0)
  t.is(await reactivePower(empty), 0)
})
