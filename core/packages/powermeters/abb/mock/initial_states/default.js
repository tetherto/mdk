'use strict'

const { strToAsciiBuffer, cleanup } = require('../lib')

module.exports = function () {
  const state = {}

  const buffer1 = Buffer.alloc(4096 * 4)
  const buffer5 = Buffer.alloc(4096 * 4)
  const buffer6 = Buffer.alloc(4096 * 4)
  const buffer8 = Buffer.alloc(4096 * 4)

  buffer5.writeBigUInt64BE(12345n, 0)
  buffer5.writeBigUInt64BE(12345n, 8)
  buffer5.writeBigInt64BE(12345n, 16)
  buffer5.writeBigUInt64BE(12345n, 24)
  buffer5.writeBigUInt64BE(12345n, 32)
  buffer5.writeBigInt64BE(12345n, 40)
  buffer5.writeBigUInt64BE(12345n, 48)
  buffer5.writeBigUInt64BE(12345n, 56)
  buffer5.writeBigInt64BE(12345n, 64)

  for (let i = 0; i < 10; i++) {
    buffer5.writeUInt32BE(1234, 5632 + i * 4)
  }
  for (let i = 0; i < 12; i++) {
    buffer5.writeInt32BE(1234, 5672 + i * 4)
  }
  buffer5.writeUInt16BE(123, 5720)
  for (let i = 0; i < 14; i++) {
    buffer5.writeUInt16BE(123, 5722 + i * 2)
  }

  buffer8.writeUInt32BE(1234, 0x900 * 2)
  strToAsciiBuffer('1.1.1').copy(buffer8, 0x908 * 2)
  buffer8.writeUInt16BE(1, 0x910 * 2)

  Buffer.alloc(8, 0).copy(buffer8, 0xa13 * 2)
  Buffer.alloc(8, 255).copy(buffer8, 0xa1f * 2)
  Buffer.alloc(8, 0).copy(buffer8, 0xa25 * 2)

  buffer8.writeUInt32BE(1234, 0xc04 * 2)
  buffer8.writeUInt32BE(1234, 0xc08 * 2)
  buffer8.writeUInt32BE(1234, 0xce2 * 2)

  for (let i = 0; i < 7; i++) {
    buffer1.writeUInt32BE(1234, 0 + i * 4)
  }
  for (let i = 0; i < 3; i++) {
    buffer1.writeUInt32BE(1234, 32 + i * 4)
  }
  for (let i = 0; i < 4; i++) {
    buffer1.writeInt32BE(1234, 44 + i * 4)
  }
  for (let i = 0; i < 14; i++) {
    buffer1.writeUInt32BE(1234, 76 + i * 4)
  }
  buffer1.writeUInt32BE(1234, 140)
  buffer1.writeUInt32BE(1234, 832)

  function bind (connection) {
    connection.on('read-holding-registers', (request, reply) => {
      const address = request.request.address
      const quantity = request.request.quantity
      let bufferStart = 0
      let buffer = buffer5
      if (address >= 0x5000 && address < 0x6000) {
        buffer = buffer5
        bufferStart = 0x5000
      } else if (address >= 0x6000 && address < 0x7000) {
        buffer = buffer6
        bufferStart = 0x6000
      } else if (address >= 0x8000 && address < 0x9000) {
        buffer = buffer8
        bufferStart = 0x8000
      } else if (address >= 0x1000 && address < 0x2000) {
        buffer = buffer1
        bufferStart = 0x1000
      }
      const start = (address - bufferStart) * 2
      const end = start + quantity * 2
      const buf = buffer.subarray(start, end)

      reply(null, buf)
    })

    connection.on('write-single-register', (request, reply) => {
      const address = request.request.address
      const value = request.request.value
      buffer5.writeUInt16BE(value, address * 2)

      reply(null, value)
    })

    connection.on('write-multiple-registers', (request, reply) => {
      const address = request.request.address
      const quantity = request.request.quantity
      const values = request.request.values
      for (let i = 0; i < quantity; i++) {
        buffer5.writeUInt16BE(values[i], address * 2 + i * 2)
      }

      reply(null, values)
    })
  }

  const initialState = JSON.parse(JSON.stringify(state))

  return { bind, state, cleanup: cleanup.bind(null, initialState, state) }
}
