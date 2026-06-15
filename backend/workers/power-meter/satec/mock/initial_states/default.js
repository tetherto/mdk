'use strict'

const { useTelemetry } = require('../lib')

module.exports = function (ctx) {
  const { sendTelemetryRequest, sendTelemetryResponse } = useTelemetry(ctx)

  const buffer257To262 = Buffer.alloc(6 * 2)
  const buffer272To278 = Buffer.alloc(7 * 2)
  const buffer296To301 = Buffer.alloc(6 * 2)

  const state = {
    257: {
      value: 6888,
      signed: true,
      name: 'voltage_v1_v12_v',
      buffer: buffer257To262,
      offset: 0
    },
    258: {
      value: 6890,
      signed: true,
      name: 'voltage_v2_v23_v',
      buffer: buffer257To262,
      offset: 2
    },
    259: {
      value: 6853,
      signed: true,
      name: 'voltage_v3_v31_v',
      buffer: buffer257To262,
      offset: 4
    },
    260: {
      value: 3457,
      signed: true,
      name: 'current_i1_a',
      buffer: buffer257To262,
      offset: 6
    },
    261: {
      value: 3524,
      signed: true,
      name: 'current_i2_a',
      buffer: buffer257To262,
      offset: 8
    },
    262: {
      value: 3469,
      signed: true,
      name: 'current_i3_a',
      buffer: buffer257To262,
      offset: 10
    },
    272: {
      value: 9989,
      signed: true,
      name: 'power_factor_l1',
      buffer: buffer272To278,
      offset: 0
    },
    273: {
      value: 9989,
      signed: true,
      name: 'power_factor_l2',
      buffer: buffer272To278,
      offset: 2
    },
    274: {
      value: 9984,
      signed: true,
      name: 'power_factor_l3',
      buffer: buffer272To278,
      offset: 4
    },
    276: {
      value: 6034,
      signed: true,
      name: 'real_import_power_kw',
      buffer: buffer272To278,
      offset: 8
    },
    277: {
      value: 6036,
      signed: false,
      name: 'reactive_power_k_var',
      buffer: buffer272To278,
      offset: 10
    },
    278: {
      value: 1160,
      signed: true,
      name: 'apparent_import_power_kva',
      buffer: buffer272To278,
      offset: 12
    },
    296: {
      value: 17,
      signed: false,
      name: 'voltage_1_2_thd',
      buffer: buffer296To301,
      offset: 0
    },
    297: {
      value: 19,
      signed: false,
      name: 'voltage_2_3_thd',
      buffer: buffer296To301,
      offset: 2
    },
    298: {
      value: 16,
      signed: false,
      name: 'voltage_3_1_thd',
      buffer: buffer296To301,
      offset: 4
    },
    299: {
      value: 30,
      signed: false,
      name: 'current_i1_thd',
      buffer: buffer296To301,
      offset: 6
    },
    300: {
      value: 39,
      signed: false,
      name: 'current_i2_thd',
      buffer: buffer296To301,
      offset: 8
    },
    301: {
      value: 38,
      signed: false,
      name: 'current_i3_thd',
      buffer: buffer296To301,
      offset: 10
    }
  }

  function bind (connection) {
    connection.on('read-holding-registers', (request, reply) => {
      const id = ctx.telemetry ? ctx.telemetry.id() : null
      sendTelemetryRequest(request.request, id)
      const address = request.request.address
      const quantity = request.request.quantity

      let bufferStart = 0
      let buffer
      if (address >= 256 && address <= 261) {
        buffer = buffer257To262
        bufferStart = 256
      } else if (address >= 271 && address <= 277) {
        buffer = buffer272To278
        bufferStart = 271
      } else if (address >= 295 && address <= 300) {
        buffer = buffer296To301
        bufferStart = 295
      } else {
        return reply(new Error('ERR_ADDRESS_INVALID'))
      }
      const start = (address - bufferStart) * 2
      const end = start + quantity * 2
      const buf = buffer.subarray(start, end)
      sendTelemetryResponse(buf, id)
      reply(null, buf)
    })
  }

  const getInitialState = () => {
    Object.entries(state).forEach(([_, { value, buffer, offset, signed }]) => {
      signed
        ? buffer.writeInt16BE(value, offset)
        : buffer.writeUInt16BE(value, offset)
    })

    return state
  }

  // Preserve the initial state for the reset
  const initialState = JSON.parse(JSON.stringify(getInitialState()))

  function cleanup () {
    Object.assign(state, initialState)
    return state
  }

  return { bind, state, cleanup }
}
