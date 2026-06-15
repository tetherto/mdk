'use strict'

const test = require('brittle')
const P3U30PowerMeter = require('../../lib/models/p3u30.powermeter')

function stubClient () {
  return {
    read: async () => Buffer.alloc(0),
    end: () => {}
  }
}

test('P3U30PowerMeter _prepInstantaneousValues parses buffer', (t) => {
  const pm = new P3U30PowerMeter({
    getClient: () => stubClient(),
    address: '127.0.0.1',
    port: 502,
    unitId: 1
  })
  const buf = Buffer.alloc(22)
  buf.writeInt16BE(400, 0)
  buf.writeInt16BE(401, 2)
  buf.writeInt16BE(402, 4)
  buf.writeInt16BE(230, 6)
  buf.writeInt16BE(231, 8)
  buf.writeInt16BE(232, 10)
  buf.writeInt16BE(0, 12)
  buf.writeInt16BE(50, 14)
  buf.writeInt16BE(12, 16)
  buf.writeInt16BE(3, 18)
  buf.writeInt16BE(15, 20)

  const v = pm._prepInstantaneousValues(buf)
  t.is(v.line_voltage_a_b_v, 400)
  t.is(v.active_power_w, 12000)
  t.is(v.reactive_power_var, 3000)
  t.is(v.apparent_power_va, 15000)
})

test('P3U30PowerMeter _prepInstantaneousValues rejects short buffer', (t) => {
  const pm = new P3U30PowerMeter({
    getClient: () => stubClient(),
    address: '127.0.0.1',
    port: 502,
    unitId: 1
  })
  t.exception(() => pm._prepInstantaneousValues(Buffer.alloc(10)))
})
