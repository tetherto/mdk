'use strict'

const test = require('brittle')
const EventEmitter = require('events')
const createDefaultState = require('../../mock/initial_states/default')

function readRegister (connection, address) {
  let out = null
  connection.emit('read-holding-registers', { request: { address, quantity: 1 } }, (err, buf) => {
    if (err) throw err
    out = buf
  })
  return out.readInt16BE(0)
}

function connect (ctx) {
  const loaded = createDefaultState(ctx)
  const connection = new EventEmitter()
  loaded.bind(connection)
  return { ...loaded, connection }
}

test('a register edited while the mock runs reaches the next read', (t) => {
  const { state, connection } = connect({})
  const before = readRegister(connection, 275)
  t.is(before, state[276].value)

  state[276].value = before + 100
  t.is(readRegister(connection, 275), before + 100)
})

test('cleanup restores the initial register values and keeps the buffers', (t) => {
  const { state, connection, cleanup } = connect({})
  const initial = state[276].value

  state[276].value = initial + 1
  t.is(readRegister(connection, 275), initial + 1)

  cleanup()
  t.is(readRegister(connection, 275), initial)
  t.ok(Buffer.isBuffer(state[276].buffer))
})

test('ctx.powerW seeds the real import power register', (t) => {
  const { connection } = connect({ powerW: 17000 })
  t.ok(readRegister(connection, 275) > 0)
})
