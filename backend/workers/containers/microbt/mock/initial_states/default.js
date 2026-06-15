'use strict'

const { randomNumber, getRandomPower } = require('../lib')

module.exports = function (ctx) {
  const state = {
    pdus: [...Array(12)].map(() => ({
      sockets: Array(21).fill(true),
      voltage_ab: 0,
      voltage_bc: 0,
      voltage_ca: 0,
      total_power: getRandomPower()
    })),
    powerMeters: [...Array(4)].map(() => ({
      voltage_ab: 0,
      voltage_bc: 0,
      voltage_ca: 0,
      total_power_factor: 0,
      freq: 0,
      current_a: 0,
      current_b: 0,
      current_c: 0,
      total_active_power: getRandomPower(),
      total_apparent_power: 0,
      total_active_energy: 0
    })),
    env: {
      temperature: 38.5,
      humidity: 32.2,
      smoke: false,
      water: false
    },
    cdu: {
      protocol: 0.4,
      indoor_dew_point_temperature: 2530,
      outdoor_ambient_temperature_sensor_fault: 0,
      indoor_temperature_humidity_sensor_fault: 0,
      makeup_water_pump_fault: 1,
      power_supply_fault: 0,
      water_immersion_fault: 0,
      unit_inlet_temp_t2: 2530,
      unit_outlet_temp_t3: 2530,
      unit_inlet_pressure_p2: 2530,
      unit_outlet_pressure_p3: 2530,
      circulation_pump_inlet_pressure_p1: 2530,
      circulation_pump_outlet_pressure_p5: 2530,
      circulation_pump_speed: 100,
      cooling_temp_t1: 2530,
      cooling_system_status: 123,
      cooling_fan_switch_state: 1,
      cycle_pump_control: 1,
      cooling_fan_control: 1,
      makeup_water_pump_control: 1,
      cooling_fan_running_speed_threshold: 987,
      cooling_fan_start_temperature_threshold: 654,
      cooling_fan_stop_temperature_threshold: 321
    },
    err: ctx.error
      ? {
          system: [0xff, 0xff],
          general: [0xff]
        }
      : {
          system: [0x00, 0x00],
          general: [0x00, 0x00]
        }
  }

  const buffers = [
    Buffer.alloc(1400),
    Buffer.alloc(6),
    Buffer.alloc(50),
    Buffer.alloc(166),
    Buffer.alloc(166),
    Buffer.alloc(166),
    Buffer.alloc(166),
    Buffer.alloc(26),
    Buffer.alloc(382),
    Buffer.alloc(382),
    Buffer.alloc(382),
    Buffer.alloc(382),
    Buffer.alloc(382),
    Buffer.alloc(382),
    Buffer.alloc(382),
    Buffer.alloc(382),
    Buffer.alloc(382),
    Buffer.alloc(382),
    Buffer.alloc(382),
    Buffer.alloc(382)
  ]
  const getInitialState = () => {
    // Update environment
    state.env.temperature = Math.floor(randomNumber(35, 40))
    state.env.humidity = Math.floor(randomNumber(58, 63))

    // Update PDUs based on sockets
    state.pdus.forEach(pdu => {
      pdu.voltage_ab = Math.floor(randomNumber(39500, 40000))
      pdu.voltage_bc = Math.floor(randomNumber(39500, 40000))
      pdu.voltage_ca = Math.floor(randomNumber(39500, 40000))
      pdu.total_power = Math.floor(pdu.sockets.reduce((acc, socket) => acc + (socket ? randomNumber(490, 500) : 0), 0))
    })

    // Update Power Meters based on PDUs
    state.powerMeters.forEach((powerMeter, index) => {
      powerMeter.voltage_ab = Math.floor(Array(3).reduce((acc, pduIndex) => acc + state.pdus[pduIndex + index * 3].voltage_ab, 0) / 3)
      powerMeter.voltage_bc = Math.floor(Array(3).reduce((acc, pduIndex) => acc + state.pdus[pduIndex + index * 3].voltage_bc, 0) / 3)
      powerMeter.voltage_ca = Math.floor(Array(3).reduce((acc, pduIndex) => acc + state.pdus[pduIndex + index * 3].voltage_ca, 0) / 3)
      powerMeter.total_power_factor = Math.floor(randomNumber(0.9, 1) * 100)
      powerMeter.freq = Math.floor(randomNumber(49, 51))
      powerMeter.current_a = Math.floor(randomNumber(900, 1000))
      powerMeter.current_b = Math.floor(randomNumber(900, 1000))
      powerMeter.current_c = Math.floor(randomNumber(900, 1000))
      powerMeter.total_active_power = [0, 1, 2].reduce((acc, pduIndex) => acc + state.pdus[pduIndex + index * 3].total_power, 0)
      powerMeter.total_apparent_power = powerMeter.total_active_power
      powerMeter.total_active_energy = powerMeter.total_active_power
    })

    // Temperature & Humidity
    buffers[1].writeInt16BE(1, 0)

    if (ctx.type === 'Kehua') {
      buffers[1].writeInt16BE(state.env.temperature * 100, 2)
      buffers[1].writeInt16BE(state.env.humidity * 100, 4)
    } else {
      buffers[1].writeInt16BE(state.env.temperature * 10, 2)
      buffers[1].writeInt16BE(state.env.humidity * 10, 4)
    }

    // Environment
    for (let i = 1; i <= 15; i++) {
      buffers[2].writeInt16BE(0, i * 2)
    }
    buffers[2].writeInt16BE(1, 0)
    buffers[2].writeInt16BE(state.env.smoke ? 1 : 0, 2)
    buffers[2].writeInt16BE(state.env.water ? 1 : 0, 12)

    // Power Meters
    state.powerMeters.forEach((pm, index) => {
      buffers[index + 3].writeInt16BE(1, 0)
      buffers[index + 3].writeUInt16BE(pm.total_active_energy, 2)
      buffers[index + 3].writeUInt16BE(pm.voltage_ab, 96)
      buffers[index + 3].writeUInt16BE(pm.voltage_bc, 98)
      buffers[index + 3].writeUInt16BE(pm.voltage_ca, 100)
      buffers[index + 3].writeUInt16BE(pm.total_power_factor, 134)
      buffers[index + 3].writeInt16BE(pm.freq, 160)
      buffers[index + 3].writeUInt16BE(pm.current_a, 102)
      buffers[index + 3].writeUInt16BE(pm.current_b, 104)
      buffers[index + 3].writeUInt16BE(pm.current_c, 106)
      buffers[index + 3].writeUInt16BE(pm.total_active_power, 110)
      buffers[index + 3].writeUInt16BE(pm.total_apparent_power, 126)
    })

    // PDUs
    state.pdus.forEach((pdu, index) => {
      buffers[index + 8].writeInt16BE(1, 0)
      pdu.sockets.forEach((socket, socketIndex) => {
        buffers[index + 8].writeInt16BE(socket ? 1 : 2, 88 + (socketIndex * 2))
      })
      buffers[index + 8].writeUInt16BE(pdu.voltage_ab, 146)
      buffers[index + 8].writeUInt16BE(pdu.voltage_bc, 150)
      buffers[index + 8].writeUInt16BE(pdu.voltage_ca, 148)
      buffers[index + 8].writeUInt16BE(pdu.total_power, 158)
    })

    // CDU
    buffers[0].writeInt16BE(1, 300 * 2)
    buffers[0].writeInt16BE(1, 301 * 2)
    buffers[0].writeInt16BE(1, 302 * 2)
    buffers[0].writeInt16BE(1, 303 * 2)
    buffers[0].writeInt16BE(state.cdu.protocol * 10, 0)
    buffers[0].writeInt16BE(12, 1 * 2)
    buffers[0].writeInt16BE(34, 2 * 2)
    buffers[0].writeInt16BE(56, 3 * 2)
    buffers[0].writeInt16BE(state.cdu.indoor_dew_point_temperature, 94 * 2)
    buffers[0].writeInt16BE(state.cdu.unit_inlet_temp_t2, 200 * 2)
    buffers[0].writeInt16BE(state.cdu.unit_outlet_temp_t3, 201 * 2)
    buffers[0].writeInt16BE(state.cdu.unit_inlet_pressure_p2, 202 * 2)
    buffers[0].writeInt16BE(state.cdu.unit_outlet_pressure_p3, 203 * 2)
    buffers[0].writeInt16BE(state.cdu.circulation_pump_inlet_pressure_p1, 204 * 2)
    buffers[0].writeInt16BE(state.cdu.circulation_pump_outlet_pressure_p5, 205 * 2)
    buffers[0].writeInt16BE(state.cdu.circulation_pump_speed, 208 * 2)
    buffers[0].writeInt16BE(state.cdu.cooling_temp_t1, 210 * 2)
    buffers[0].writeInt16BE(state.cdu.cooling_system_status, 211 * 2)
    buffers[0].writeInt16BE(state.cdu.cooling_fan_switch_state, 603 * 2)
    buffers[0].writeInt16BE(state.cdu.cycle_pump_control, 605 * 2)
    buffers[0].writeInt16BE(state.cdu.cooling_fan_control, 606 * 2)
    buffers[0].writeInt16BE(state.cdu.makeup_water_pump_control, 607 * 2)
    buffers[0].writeInt16BE(state.cdu.cooling_fan_running_speed_threshold, 612 * 2)
    buffers[0].writeInt16BE(state.cdu.cooling_fan_start_temperature_threshold, 613 * 2)
    buffers[0].writeInt16BE(state.cdu.cooling_fan_stop_temperature_threshold, 614 * 2)

    // Errors
    Buffer.from(state.err.system).copy(buffers[0], 289 * 2)
    Buffer.from(state.err.general).copy(buffers[0], 94 * 2)

    return state
  }

  function bind (connection) {
    connection.on('read-holding-registers', (request, reply) => {
      const unitId = request.unitId
      const address = request.request.address
      const quantity = request.request.quantity
      if (unitId === 1) {
        reply(null, buffers[0].subarray((address * 2), (address + quantity) * 2))
      } else if (unitId > 1 && unitId <= 20) {
        reply(null, buffers[unitId - 1].subarray((address * 2) - 2, (address * 2) - 2 + quantity * 2))
      } else {
        reply(new Error('ERR_UNIT_ID_INVALID'))
      }
    })

    connection.on('write-single-register', (request, reply) => {
      const unitId = request.unitId
      const address = request.request.address
      const value = request.request.value.readUInt16BE(0)
      if (unitId >= 9 && unitId <= 20) {
        const socketIndex = (307 - address)
        state.pdus[unitId - 9].sockets[socketIndex] = value === 1
        reply(null, 0, request.request.value)
      } else if (unitId === 1) {
        const resp = request.request.value
        switch (address) {
          case 601:
            state.cdu.cooling_fan_control = value
            state.cdu.cycle_pump_control = value
            state.cdu.makeup_water_pump_control = value
            state.cdu.circulation_pump_running_status = value
            break
          case 606:
            state.cdu.cooling_fan_control = value
            break
          case 612:
            state.cdu.cooling_fan_running_speed_threshold = value
            break
          case 613:
            state.cdu.cooling_fan_start_temperature_threshold = value
            break
          case 614:
            state.cdu.cooling_fan_stop_temperature_threshold = value
            break
        }
        reply(null, 0, resp)
      } else {
        reply(new Error('ERR_UNIT_ID_INVALID'))
      }
    })

    connection.on('write-multiple-registers', (request, reply) => {
      const unitId = request.unitId
      const address = request.request.address
      const values = request.request.values

      if (unitId === 1) {
        // Auth write: container sends address 305 (16 registers); some clients may send 304
        if ((address === 304 || address === 305) && values.length === 16) {
          reply(null, 0, Buffer.from([1]))
        }
      }
    })
  }

  const currentState = getInitialState()
  const clonedInitialState = JSON.parse(JSON.stringify(currentState))

  function cleanup () {
    Object.assign(state, clonedInitialState)
    return state
  }

  return { bind, cleanup, state }
}
