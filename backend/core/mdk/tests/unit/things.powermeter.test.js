'use strict'

const test = require('brittle')
const PowerMeter = require('../../lib/things/powermeter')

test('PowerMeter extends Thing with type "powermeter" and cache fields', (t) => {
  const pm = new PowerMeter({})
  t.is(pm._type, 'powermeter')
  t.is(pm.cache, null)
  t.is(pm.cacheTime, 0)
})

test('calculateTension averages three phase-to-phase values', (t) => {
  const pm = new PowerMeter({})

  t.is(pm.calculateTension(230, 235, 240), (230 + 235 + 240) / 3)
})

test('calculateTension works with negatives', (t) => {
  const pm = new PowerMeter({})

  t.is(pm.calculateTension(-3, -6, 0), (-3 + -6 + 0) / 3)
})

test('getRealtimeData delegates to _prepSnap(true)', async (t) => {
  const pm = new PowerMeter({})

  await t.exception(async () => {
    await pm.getRealtimeData()
  }, /ERR_NO_IMPL/)

  let arg
  pm._prepSnap = async (realtime) => {
    arg = realtime
    return { stats: { status: 'ok' }, config: {} }
  }
  const out = await pm.getRealtimeData()
  t.is(arg, true)
  t.alike(out.stats, { status: 'ok' })
})
