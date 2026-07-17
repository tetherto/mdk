'use strict'

const test = require('brittle')
const B2XPowerMeter = require('../../lib/models/b2x.powermeter')

const REG_START = 23297

function buildRegisterMap () {
  const master = Buffer.alloc(60)
  master.writeUInt32BE(2310, 0) // v1_n 231.0
  master.writeUInt32BE(2320, 4) // v2_n 232.0
  master.writeUInt32BE(2330, 8) // v3_n 233.0
  master.writeUInt32BE(4000, 12) // v1_v2 400.0
  master.writeUInt32BE(4010, 16) // v2_v3 401.0
  master.writeUInt32BE(4020, 20) // v1_v3 402.0
  master.writeUInt32BE(1500, 24) // i1 15.00
  master.writeUInt32BE(1600, 28) // i2 16.00
  master.writeUInt32BE(1700, 32) // i3 17.00
  master.writeUInt32BE(100, 36) // in 1.00
  master.writeInt32BE(500000, 40) // active power 5000.00
  master.writeInt32BE(-200000, 56) // reactive power -2000.00
  return master
}

function createMeter (client) {
  return new B2XPowerMeter({
    address: '127.0.0.1',
    port: 5020,
    unitId: 0,
    conf: {},
    getClient: () => ({ end () {}, ...client })
  })
}

function close (t, actual, expected, msg) {
  t.ok(Math.abs(actual - expected) < 1e-6, msg || `${actual} ~ ${expected}`)
}

test('B2X _readValues concatenates chunked holding-register reads', async t => {
  const master = buildRegisterMap()
  const reads = []
  const meter = createMeter({
    async read (fc, address, count) {
      reads.push([address, count])
      const start = (address - REG_START) * 2
      return master.subarray(start, start + count * 2)
    }
  })

  const data = await meter._readValues()
  t.alike(reads, [[23297, 15], [23312, 15]])
  t.is(data.length, 60)
  t.alike(data, master)
})

test('B2X _prepSnap scales registers into the snapshot shape', async t => {
  const master = buildRegisterMap()
  const meter = createMeter({
    async read (fc, address, count) {
      const start = (address - REG_START) * 2
      return master.subarray(start, start + count * 2)
    }
  })

  const snap = await meter._prepSnap()
  t.is(snap.success, true)
  t.alike(snap.config, {})
  close(t, snap.stats.power_w, 5000, 'power_w scaled by 0.01')
  close(t, snap.stats.tension_v, 401, 'tension is phase-to-phase average')

  const s = snap.stats.powermeter_specific
  close(t, s.v1_n_v, 231)
  close(t, s.v2_n_v, 232)
  close(t, s.v3_n_v, 233)
  close(t, s.i1_a, 15)
  close(t, s.i2_a, 16)
  close(t, s.i3_a, 17)
  close(t, s.in_a, 1)
  close(t, s.reactive_power_total_var, -2000)
})

test('B2X reset commands write the documented registers', async t => {
  const writes = []
  const meter = createMeter({
    async write (register, value) {
      writes.push([register, value])
    }
  })

  const results = [
    await meter.resetPowerFailCounter(),
    await meter.resetPowerOutageTime(),
    await meter.resetSystemLog(),
    await meter.resetEventLog(),
    await meter.resetNetQualityLog()
  ]

  for (const res of results) t.alike(res, { success: true })
  t.alike(writes.map(([reg]) => reg), ['hr36608', 'hr36613', 'hr36657', 'hr36658', 'hr36659'])
  for (const [, value] of writes) t.alike(value, Buffer.from([0x01]))
})

test('B2X setAlarmConfig writes all five config packets in order', async t => {
  const writes = []
  const meter = createMeter({
    async write (register, value) {
      writes.push([register, value])
    }
  })

  const res = await meter.setAlarmConfig({
    index: 3,
    quantity: '1.2.3.4.5.6',
    limit_on: 1000,
    limit_off: 500,
    delay_on: 10,
    delay_off: 20,
    action: { types: ['writeLog'], output: 1 }
  })

  t.alike(res, { success: true })
  t.alike(writes.map(([reg]) => reg), ['hr35936', 'hr35937', 'hr35940', 'hr35948', 'hr35952'])
  t.is(writes[0][1].readUInt16BE(0), 3, 'index packet written first')
})

test('B2X getAlarmConfig rejects: index echo packet is 1 byte but parsed as UInt16', async t => {
  const meter = createMeter({
    async write () {},
    async read (register) {
      const sizes = { 'hr35937-35939': 6, 'hr35940-35947': 16, 'hr35948-35951': 8, 'hr35952-35954': 4 }
      return Buffer.alloc(sizes[register])
    }
  })

  await t.exception.all(meter.getAlarmConfig(1), /outside buffer bounds/)
})
