'use strict'

const test = require('brittle')
const PM5340PowerMeter = require('../../lib/models/pm5340.powemeter')

function stubClient () {
  return {
    read: async () => Buffer.alloc(0),
    end: () => {}
  }
}

test('PM5340PowerMeter _prepInstantaneousValues reads floats at expected offsets', (t) => {
  const pm = new PM5340PowerMeter({
    getClient: () => stubClient(),
    address: '127.0.0.1',
    port: 502,
    unitId: 1
  })
  const buf = Buffer.alloc(224)
  buf.writeFloatBE(1.5, 0)
  buf.writeFloatBE(400, 40)
  buf.writeFloatBE(401, 44)
  buf.writeFloatBE(402, 48)
  buf.writeFloatBE(2, 120)
  buf.writeFloatBE(50, 220)

  const v = pm._prepInstantaneousValues(buf)
  t.is(v.current_a_a, 1.5)
  t.is(v.voltage_a_b_v, 400)
  t.is(v.active_power_total_w, 2000)
  t.is(v.frequency_hz, 50)
})

test('PowerMeter calculateTension average', (t) => {
  const pm = new PM5340PowerMeter({
    getClient: () => stubClient(),
    address: '127.0.0.1',
    port: 502,
    unitId: 1
  })
  t.is(pm.calculateTension(300, 303, 306), 303)
})
