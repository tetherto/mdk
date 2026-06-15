'use strict'

const { getRandomPower } = require('../lib')

module.exports = function () {
  const buffer14To24 = Buffer.alloc(11 * 2)

  const state = {
    2014: { value: 12000, name: 'line_voltage_a_b_v', buffer: buffer14To24, offset: 0 },
    2015: { value: 1222, name: 'line_voltage_b_c_v', buffer: buffer14To24, offset: 2 },
    2016: { value: 1303, name: 'line_voltage_c_a_v', buffer: buffer14To24, offset: 4 },
    2017: { value: 1783, name: 'phase_voltage_a_v', buffer: buffer14To24, offset: 6 },
    2018: { value: 938, name: 'phase_voltage_b_v', buffer: buffer14To24, offset: 8 },
    2019: { value: 1502, name: 'phase_voltage_c_v', buffer: buffer14To24, offset: 10 },
    2020: { value: 1203, name: 'residual_voltage', buffer: buffer14To24, offset: 12 },
    2021: { value: 3702, name: 'frequency_hz', buffer: buffer14To24, offset: 14 },
    2022: { value: getRandomPower(), name: 'active_power_w', buffer: buffer14To24, offset: 16 },
    2023: { value: 2104, name: 'reactive_power_var', buffer: buffer14To24, offset: 18 },
    2024: { value: 3848, name: 'apparent_power_va', buffer: buffer14To24, offset: 20 }
  }

  function bind (connection) {
    connection.on('read-holding-registers', (request, reply) => {
      const address = request.request.address !== 65535 ? request.request.address : 0
      const quantity = request.request.quantity

      const bufferStart = 2013
      let buffer

      if (address >= 2013 && address <= 2023) {
        buffer = buffer14To24
      } else {
        return reply(new Error('ERR_ADDRESS_INVALID'))
      }
      const start = (address - bufferStart) * 2
      const end = start + quantity * 2
      const buf = buffer.subarray(start, end)
      reply(null, buf)
    })
  }

  const getInitialState = () => {
    // Update `active_power_w` value with `getRandomPower()`
    state[2022].value = getRandomPower()

    Object.entries(state).forEach(([_, { value, buffer, offset }]) => {
      buffer.writeInt16BE(value, offset)
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
