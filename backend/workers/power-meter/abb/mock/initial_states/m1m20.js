'use strict'

const { getActivePower } = require('../lib')

module.exports = function () {
  let state = {
    ...getActivePower(),
    reactive_power_total_var: -2086731,
    reactive_power_l1_var: -627943,
    reactive_power_l2_var: -709440,
    reactive_power_l3_var: -749348,
    apparent_power_total_va: 22247591,
    apparent_power_l1_va: 7363807,
    apparent_power_l2_va: 7528042,
    apparent_power_l3_va: 7355742
  }

  const buffer5 = Buffer.alloc(4096 * 4)
  const buffer6 = Buffer.alloc(4096 * 4)
  const bufferc = Buffer.alloc(4096 * 4)

  buffer5.writeBigUInt64BE(12345n, 0)
  buffer5.writeBigUInt64BE(12345n, 8)
  buffer5.writeBigUInt64BE(12345n, 24)
  buffer5.writeBigUInt64BE(12345n, 32)
  buffer5.writeBigUInt64BE(12345n, 48)

  const setInitialState = () => {
    state = {
      ...state,
      ...getActivePower()
    }
    buffer5.writeBigUInt64BE(12345n, 0)
    buffer5.writeBigUInt64BE(12345n, 8)
    buffer5.writeBigUInt64BE(12345n, 24)
    buffer5.writeBigUInt64BE(12345n, 32)
    buffer5.writeBigUInt64BE(12345n, 48)

    for (let i = 0; i < 24; i++) {
      buffer5.writeUInt32BE(1234, 5632 + (i * 4))
    }

    for (let i = 0; i < 23; i++) {
      buffer5.writeInt32BE(1234, 5684 + (i * 4))
    }

    buffer5.writeUInt16BE(1234, 5732)

    for (let i = 0; i < 4; i++) {
      buffer5.writeInt16BE(123, 5760 + (i * 2))
    }

    bufferc.writeInt32BE(Math.round(state.active_power_total_w), 5684)
    bufferc.writeInt32BE(Math.round(state.active_power_l1_w), 5688)
    bufferc.writeInt32BE(Math.round(state.active_power_l2_w), 5692)
    bufferc.writeInt32BE(Math.round(state.active_power_l3_w), 5696)
    bufferc.writeInt32BE(Math.round(state.reactive_power_total_var), 5700)
    bufferc.writeInt32BE(Math.round(state.reactive_power_l1_var), 5704)
    bufferc.writeInt32BE(Math.round(state.reactive_power_l2_var), 5708)
    bufferc.writeInt32BE(Math.round(state.reactive_power_l3_var), 5712)
    bufferc.writeInt32BE(Math.round(state.apparent_power_total_va), 5716)
    bufferc.writeInt32BE(Math.round(state.apparent_power_l1_va), 5720)
    bufferc.writeInt32BE(Math.round(state.apparent_power_l2_va), 5724)
    bufferc.writeInt32BE(Math.round(state.apparent_power_l3_va), 5728)

    // harmonics
    buffer5.writeUInt16BE(123, 0xd00 * 2)
    buffer5.writeUInt16BE(123, 0xd80 * 2)
    buffer5.writeUInt16BE(123, 0xe00 * 2)
    buffer5.writeUInt16BE(123, 0xe80 * 2)
    buffer5.writeUInt16BE(123, 0xf00 * 2)
    buffer5.writeUInt16BE(123, 0xf80 * 2)
    buffer6.writeUInt16BE(123, 0x0)
    buffer6.writeUInt16BE(123, 0x80 * 2)
    buffer6.writeUInt16BE(123, 0x100 * 2)
  }

  setInitialState()

  function bind (connection) {
    connection.on('read-holding-registers', (request, reply) => {
      const address = request.request.address
      const quantity = request.request.quantity

      let bufferStart = 0
      let buffer

      if (address >= 0x5000 && address < 0x6000) {
        buffer = buffer5
        bufferStart = 0x5000
      } else if (address >= 0x6000 && address < 0x7000) {
        buffer = buffer6
        bufferStart = 0x6000
      } else if (address >= 0xc000 && address < 0xd000) {
        buffer = bufferc
        bufferStart = 0xc000
      } else {
        reply(new Error('address out of range'))
        return
      }
      const start = (address - bufferStart) * 2
      const end = start + quantity * 2
      const buf = buffer.subarray(start, end)

      reply(null, buf)
    })
  }

  const initialState = JSON.parse(JSON.stringify(state))

  function cleanup () {
    Object.assign(state, initialState)
    return state
  }

  return { bind, state, cleanup }
}
