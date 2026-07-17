'use strict'

const test = require('brittle')
const M1M20PowerMeter = require('../../lib/models/m1m20.powermeter')
const M4M20PowerMeter = require('../../lib/models/m4m20.powermeter')
const REU615PowerMeter = require('../../lib/models/reu615.powermeter')

// M1M20/M4M20 read two register blocks: 23297x24 (48 bytes) + 51995x10 (20 bytes)
function buildM20Buffer () {
  const buf = Buffer.alloc(68)
  buf.writeUInt32BE(2310, 4) // v1_n 231.0
  buf.writeUInt32BE(2320, 8) // v2_n 232.0
  buf.writeUInt32BE(2330, 12) // v3_n 233.0
  buf.writeUInt32BE(4000, 16) // v1_v2 400.0
  buf.writeUInt32BE(4010, 20) // v2_v3 401.0
  buf.writeUInt32BE(4020, 24) // v3_v1 402.0
  buf.writeUInt32BE(1500, 32) // i1 15.00
  buf.writeUInt32BE(1600, 36) // i2 16.00
  buf.writeUInt32BE(1700, 40) // i3 17.00
  buf.writeUInt32BE(100, 44) // in 1.00
  buf.writeInt32BE(5000, 48) // active power raw watts
  buf.writeInt32BE(-2000, 64) // reactive power
  return buf
}

function createMeter (ModelClass, master) {
  return new ModelClass({
    address: '127.0.0.1',
    port: 5020,
    unitId: 0,
    conf: {},
    getClient: () => ({
      end () {},
      async read (fc, address, count) {
        const offset = address === 23297 ? 0 : 48
        return master.subarray(offset, offset + count * 2)
      }
    })
  })
}

function close (t, actual, expected, msg) {
  t.ok(Math.abs(actual - expected) < 1e-6, msg || `${actual} ~ ${expected}`)
}

test('M1M20 _readValues concatenates both register blocks', async t => {
  const master = buildM20Buffer()
  const meter = createMeter(M1M20PowerMeter, master)

  const data = await meter._readValues()
  t.is(data.length, 68)
  t.alike(data, master)
})

test('M1M20 _prepSnap reports raw active power', async t => {
  const master = buildM20Buffer()
  const meter = createMeter(M1M20PowerMeter, master)

  const snap = await meter._prepSnap()
  t.is(snap.success, true)
  t.is(snap.stats.power_w, 5000)
  close(t, snap.stats.tension_v, 401)

  const s = snap.stats.powermeter_specific
  close(t, s.v1_n_v, 231)
  close(t, s.v3_v1_v, 402)
  close(t, s.i2_a, 16)
  close(t, s.in_a, 1)
  t.is(s.reactive_power_total_var, -2000)
})

test('M4M20 _prepSnap negates active power for power_w', async t => {
  const master = buildM20Buffer()
  const meter = createMeter(M4M20PowerMeter, master)

  t.is((await meter._readValues()).length, 68)

  const snap = await meter._prepSnap()
  t.is(snap.success, true)
  t.is(snap.stats.power_w, -5000)
  t.is(snap.stats.powermeter_specific.active_power_total_w, 5000)
  close(t, snap.stats.tension_v, 401)
})

test('REU615 _prepSnap reads power and voltage registers', async t => {
  const master = Buffer.alloc(8)
  master.writeInt32BE(-12345, 0)
  master.writeUInt32BE(400, 4)

  const reads = []
  const meter = new REU615PowerMeter({
    address: '127.0.0.1',
    port: 5020,
    unitId: 0,
    conf: {},
    getClient: () => ({
      end () {},
      async read (fc, address, count) {
        reads.push([address, count])
        const offset = address === 1940 ? 0 : 4
        return master.subarray(offset, offset + count * 2)
      }
    })
  })

  const snap = await meter._prepSnap()
  t.alike(reads, [[1940, 2], [1942, 2]])
  t.alike(snap, {
    success: true,
    stats: { power_w: -12345, voltage_v: 400 },
    config: {}
  })
})
