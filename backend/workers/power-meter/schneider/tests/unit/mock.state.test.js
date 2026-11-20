'use strict'

const test = require('brittle')
const EventEmitter = require('events')
const createP3u30State = require('../../mock/initial_states/p3u30')
const createPm5340State = require('../../mock/initial_states/pm5340')

function read (connection, address, quantity = 1) {
  let out = null
  connection.emit('read-holding-registers', { request: { address, quantity } }, (err, buf) => {
    if (err) throw err
    out = buf
  })
  return out
}

function connect (create, ctx) {
  const loaded = create(ctx)
  const connection = new EventEmitter()
  loaded.bind(connection)
  return { ...loaded, connection }
}

test('p3u30: a register edited while the mock runs reaches the next read', (t) => {
  const { state, connection, cleanup } = connect(createP3u30State)
  const initial = state[2022].value
  t.is(read(connection, 2021).readInt16BE(0), initial)

  state[2022].value = 1234
  t.is(read(connection, 2021).readInt16BE(0), 1234)

  cleanup()
  t.is(read(connection, 2021).readInt16BE(0), initial)
  t.ok(Buffer.isBuffer(state[2022].buffer))
})

test('pm5340: a value edited while the mock runs reaches the next read', (t) => {
  const { state, connection, cleanup } = connect(createPm5340State, { powerW: 9000 })
  const initial = state.active_power_total_w
  t.is(read(connection, 2999 + 60, 2).readFloatBE(0), Math.fround(initial))

  state.active_power_total_w = 42.5
  t.is(read(connection, 2999 + 60, 2).readFloatBE(0), 42.5)

  cleanup()
  t.is(read(connection, 2999 + 60, 2).readFloatBE(0), Math.fround(initial))
})

test('both mocks refuse a register outside their map', (t) => {
  const p3u30 = connect(createP3u30State)
  t.exception(() => read(p3u30.connection, 100), /ERR_ADDRESS_INVALID/)
  t.exception(() => read(p3u30.connection, 65535), /ERR_ADDRESS_INVALID/, 'the 65535 probe maps to address 0')
  const pm5340 = connect(createPm5340State)
  t.exception(() => read(pm5340.connection, 100), /Illegal data address/)
})
