'use strict'

const test = require('brittle')
const EventEmitter = require('events')
const {
  strToAsciiBuffer,
  getRandomPower,
  getActivePower,
  cleanup,
  randomNumber
} = require('../../mock/lib')
const createDefaultState = require('../../mock/initial_states/default')

function readRegisters (connection, address, quantity) {
  let out = null
  connection.emit('read-holding-registers', { request: { address, quantity } }, (err, buf) => {
    if (err) throw err
    out = buf
  })
  return out
}

test('strToAsciiBuffer maps chars to byte codes', t => {
  t.alike([...strToAsciiBuffer('AB0')], [65, 66, 48])
})

test('randomNumber stays within [min, max] with 2-decimal precision', t => {
  for (let i = 0; i < 50; i++) {
    const n = randomNumber(5, 10)
    t.ok(n >= 5 && n <= 10)
    t.is(n, parseFloat(n.toFixed(2)))
  }
})

test('getRandomPower returns a finite number in the simulated range', t => {
  for (let i = 0; i < 20; i++) {
    const p = getRandomPower()
    t.ok(Number.isFinite(p))
    t.ok(p >= -6700000 && p <= 300000)
  }
})

test('getActivePower total is the sum of the three phases', t => {
  const power = getActivePower()
  const { active_power_l1_w: l1, active_power_l2_w: l2, active_power_l3_w: l3 } = power
  t.is(power.active_power_total_w, l1 + l2 + l3)
})

test('cleanup restores state in place and returns it', t => {
  const state = { a: 1, extra: true }
  const out = cleanup(state, { a: 2, b: 3 })
  t.is(out, state)
  t.alike(state, { a: 2, b: 3, extra: true })
})

test('default mock state serves reads from every register bank', t => {
  const { bind, state, cleanup } = createDefaultState()
  t.alike(state, {})

  const connection = new EventEmitter()
  bind(connection)

  t.is(readRegisters(connection, 0x5000, 4).readBigUInt64BE(0), 12345n, 'bank 5 seeded')
  t.is(readRegisters(connection, 0x6000, 2).readUInt32BE(0), 0, 'bank 6 is zeroed')
  t.is(readRegisters(connection, 0x8900, 2).readUInt32BE(0), 1234, 'bank 8 seeded')
  t.is(readRegisters(connection, 0x1000, 2).readUInt32BE(0), 1234, 'bank 1 seeded')
  t.is(readRegisters(connection, 50, 2).length, 4, 'out-of-bank address falls back to bank 5')

  t.alike(cleanup(), {})
})

test('default mock state handles single and multiple register writes', t => {
  const { bind } = createDefaultState()
  const connection = new EventEmitter()
  bind(connection)

  connection.emit('write-single-register', { request: { address: 100, value: 99 } }, (err, value) => {
    t.is(err, null)
    t.is(value, 99)
  })
  t.is(readRegisters(connection, 100, 1).readUInt16BE(0), 99)

  connection.emit('write-multiple-registers', { request: { address: 110, quantity: 2, values: [7, 8] } }, (err, values) => {
    t.is(err, null)
    t.alike(values, [7, 8])
  })
  const buf = readRegisters(connection, 110, 2)
  t.is(buf.readUInt16BE(0), 7)
  t.is(buf.readUInt16BE(2), 8)
})
