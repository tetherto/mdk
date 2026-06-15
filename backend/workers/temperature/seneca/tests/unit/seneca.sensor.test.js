'use strict'

const test = require('brittle')
const { FUNCTION_CODES } = require('svc-facs-modbus/lib/constants')
const SenecaSensor = require('../../lib/seneca.sensor')

test('SenecaSensor requires getClient', (t) => {
  t.exception(() => new SenecaSensor({ address: '127.0.0.1', port: 502, unitId: 1 }), /ERR_NO_CLIENT/)
})

test('getSnap reads temperature via Modbus client', async (t) => {
  const buf = Buffer.alloc(2)
  buf.writeUInt16BE(355, 0) // 35.5 °C

  const sensor = new SenecaSensor({
    getClient: () => ({
      read: async (fc, register) => {
        t.is(fc, FUNCTION_CODES.READ_HOLDING_REGISTERS)
        t.is(register, 3)
        return buf
      },
      end: () => {}
    }),
    address: '127.0.0.1',
    port: 5020,
    unitId: 0,
    register: 3,
    conf: {}
  })

  const snap = await sensor.getSnap()
  t.ok(snap.success)
  t.is(snap.stats.status, 'ok')
  t.is(snap.stats.temp_c, 35.5)
})

test('850.0 raw value marks sensor_error', async (t) => {
  const buf = Buffer.alloc(2)
  buf.writeUInt16BE(8500, 0)

  const sensor = new SenecaSensor({
    getClient: () => ({
      read: async () => buf,
      end: () => {}
    }),
    address: '127.0.0.1',
    port: 5020,
    unitId: 0,
    register: 2,
    conf: {}
  })

  const snap = await sensor.getSnap()
  t.ok(snap.success)
  t.is(snap.stats.status, 'error')
  t.ok(Array.isArray(snap.stats.errors))
  t.is(snap.stats.errors[0].name, 'sensor_error')
})

test('close ends Modbus client', (t) => {
  let ended = false
  const sensor = new SenecaSensor({
    getClient: () => ({
      read: async () => Buffer.alloc(2),
      end: () => { ended = true }
    }),
    address: '127.0.0.1',
    port: 5020,
    unitId: 0,
    register: 2,
    conf: {}
  })
  sensor.close()
  t.ok(ended)
})
