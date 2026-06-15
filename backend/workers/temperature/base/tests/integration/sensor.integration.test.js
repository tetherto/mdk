'use strict'

const test = require('brittle')
const Sensor = require('../../lib/sensor')
const stats = require('../../lib/templates/stats')

test('Sensor subclass can supply _prepSnap; getRealtimeData returns snap', async (t) => {
  class TestSensor extends Sensor {
    async _prepSnap (realtime) {
      t.is(realtime, true)
      return {
        stats: { status: 'online', rtd: 42 },
        config: { model: 'test' }
      }
    }
  }

  const sensor = new TestSensor({ conf: {} })
  const snap = await sensor.getRealtimeData()
  t.alike(snap.stats, { status: 'online', rtd: 42 })
  t.alike(snap.config, { model: 'test' })
})

test('stats template is loadable alongside Sensor', (t) => {
  t.ok(stats.specs.default)
  t.ok(stats.specs.sensor_default)
})
