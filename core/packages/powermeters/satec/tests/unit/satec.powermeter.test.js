'use strict'

const test = require('brittle')
const SatecPowerMeter = require('../../lib/satec.powermeter')

const createBufferFromRegisters = (registers) => {
  const buffer = Buffer.alloc(38)
  registers.forEach(({ offset, value, signed = true }) => {
    if (signed) {
      buffer.writeInt16BE(value, offset)
      return
    }
    buffer.writeUInt16BE(value, offset)
  })
  return buffer
}

test('constructor requires getClient', (t) => {
  t.plan(1)

  try {
    // eslint-disable-next-line no-new
    new SatecPowerMeter({ address: '127.0.0.1', port: 5020, unitId: 0 })
    t.fail('expected constructor to throw')
  } catch (err) {
    t.is(err.message, 'ERR_NO_CLIENT')
  }
})

test('prepInstantaneousValues rejects invalid buffers', (t) => {
  t.plan(2)

  const meter = new SatecPowerMeter({
    address: '127.0.0.1',
    port: 5020,
    unitId: 0,
    collectSnapsItvMs: 1000,
    getClient: () => ({ read: async () => Buffer.alloc(0), end: () => {} })
  })

  try {
    meter._prepInstantaneousValues(null)
    t.fail('expected null input to throw')
  } catch (err) {
    t.is(err.message, 'ERR_DATA_INVALID: Expected a Buffer.')
  }

  try {
    meter._prepInstantaneousValues(Buffer.alloc(10))
    t.fail('expected short buffer to throw')
  } catch (err) {
    t.is(err.message, 'ERR_DATA_INSUFFICIENT: Expected 38 bytes but received 10.')
  }
})

test('prepSnap computes stats and rolling average', async (t) => {
  const meter = new SatecPowerMeter({
    address: '127.0.0.1',
    port: 5020,
    unitId: 0,
    collectSnapsItvMs: 1000,
    getClient: () => ({ read: async () => Buffer.alloc(0), end: () => {} })
  })

  meter.cache = createBufferFromRegisters([
    { offset: 0, value: 7000, signed: true },
    { offset: 2, value: 7000, signed: false },
    { offset: 4, value: 7000, signed: true },
    { offset: 6, value: 1000, signed: true },
    { offset: 8, value: 1000, signed: false },
    { offset: 10, value: 1000, signed: true },
    { offset: 12, value: 9999, signed: true },
    { offset: 14, value: 9999, signed: true },
    { offset: 16, value: 9999, signed: true },
    { offset: 20, value: 6000, signed: true },
    { offset: 22, value: 2000, signed: false },
    { offset: 24, value: 3000, signed: true },
    { offset: 26, value: 20, signed: false },
    { offset: 28, value: 20, signed: false },
    { offset: 30, value: 20, signed: false },
    { offset: 32, value: 10, signed: false },
    { offset: 34, value: 10, signed: false },
    { offset: 36, value: 10, signed: false }
  ])

  const snapA = await meter._prepSnap(true)
  const snapB = await meter._prepSnap(true)

  t.is(snapA.success, true)
  t.ok(snapA.stats.power_w > 0, 'power should be positive')
  t.ok(snapA.stats.tension_v > 0, 'tension should be positive')
  t.is(
    snapA.stats.powermeter_specific.historical_values.real_import_power_w_last15m_avg,
    snapA.stats.power_w
  )
  t.is(
    snapB.stats.powermeter_specific.historical_values.real_import_power_w_last15m_avg,
    snapB.stats.power_w
  )
})
