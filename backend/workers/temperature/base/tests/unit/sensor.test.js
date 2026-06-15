'use strict'

const test = require('brittle')
const Sensor = require('../../lib/sensor')

test('Sensor constructor sets cache and extends thing type sensor', (t) => {
  const s = new Sensor({})
  t.is(s.cache, null)
  t.is(s._type, 'sensor')
})

test('getRealtimeData delegates to _prepSnap with realtime flag', async (t) => {
  const s = new Sensor({})
  let arg
  s._prepSnap = async (realtime) => {
    arg = realtime
    return { stats: { status: 'ok' }, config: {} }
  }
  const out = await s.getRealtimeData()
  t.is(arg, true)
  t.alike(out.stats, { status: 'ok' })
})
