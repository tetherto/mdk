/* eslint-disable camelcase */
'use strict'

const { getRandomPower } = require('../lib')

module.exports = function () {
  const active_power = {
    active_power_a_w: getRandomPower(),
    active_power_b_w: getRandomPower(),
    active_power_c_w: getRandomPower()
  }

  active_power.active_power_total_w = active_power.active_power_a_w + active_power.active_power_b_w + active_power.active_power_c_w

  const buffer3 = Buffer.alloc(4096 * 4)
  let state = {
    ...active_power,
    current_a_a: 5.134268283843994,
    current_b_a: 5.299433708190918,
    current_c_a: 5.463783264160156,
    current_n_a: 0,
    current_g_a: null,
    current_avg_a: 5.299161911010742,
    current_unbalance_a_pct: 3.111692428588867,
    current_unbalance_b_pct: 0.00512905977666378,
    current_unbalance_c_pct: 3.1065545082092285,
    current_unbalance_worst_pct: 3.111692428588867,
    voltage_a_b_v: 391.2933654785156,
    voltage_b_c_v: 391.5605773925781,
    voltage_c_a_v: 390.3021545410156,
    voltage_l_l_avg_v: 391.0520324707031,
    voltage_a_n_v: 226.00436401367188,
    voltage_b_n_v: 225.3396759033203,
    voltage_c_n_v: 225.99339294433594,
    voltage_l_n_avg_v: 225.77915954589844,
    voltage_unbalance_a_b_pct: 0.06171378120779991,
    voltage_unbalance_b_c_pct: 0.1300453394651413,
    voltage_unbalance_c_a_pct: 0.1917591243982315,
    voltage_unbalance_l_l_worst_pct: 0.1917591243982315,
    voltage_unbalance_a_n_pct: 0.09974545985460281,
    voltage_unbalance_b_n_pct: 0.1946519911289215,
    voltage_unbalance_c_n_pct: 0.09488625824451447,
    voltage_unbalance_l_n_worst_pct: 0.1946519911289215,
    reactive_power_a_var: -1019.5173025131226,
    reactive_power_b_var: -1068.1843757629395,
    reactive_power_c_var: -1090.5203819274902,
    reactive_power_total_var: -3178.222179412842,
    apparent_power_a_va: 1160.3670120239258,
    apparent_power_b_va: 1194.172739982605,
    apparent_power_c_va: 1234.778881072998,
    apparent_power_total_va: 3589.3187522888184,
    power_factor_a: 1.5224714279174805,
    power_factor_b: 1.552926778793335,
    power_factor_c: 1.5309479236602783,
    power_factor_total: 1.535520076751709,
    displacement_power_factor_a: 1.3314577341079712,
    displacement_power_factor_b: 1.3726078271865845,
    displacement_power_factor_c: 1.3341515064239502,
    displacement_power_factor_total: 1.3460724353790283,
    frequency_hz: 49.9857177734375
  }

  function bind (connection) {
    connection.on('read-holding-registers', (request, reply) => {
      const address = request.request.address
      const quantity = request.request.quantity
      let bufferStart = 0
      let buffer
      if (address >= 2999 && address < 3999) {
        buffer = buffer3
        bufferStart = 2999
      } else {
        return reply(new Error('Illegal data address'))
      }
      const start = (address - bufferStart) * 2
      const end = start + quantity * 2
      const buf = buffer.subarray(start, end)
      reply(null, buf)
    })
  }

  const getInitialState = () => {
    // Dynamically update active_power
    const active_power = {
      active_power_a_w: getRandomPower(),
      active_power_b_w: getRandomPower(),
      active_power_c_w: getRandomPower()
    }
    active_power.active_power_total_w = active_power.active_power_a_w + active_power.active_power_b_w + active_power.active_power_c_w

    // Update state with new active power values
    state = {
      ...state,
      ...active_power
    }

    // write data from state to buffer3
    buffer3.writeFloatBE(state.current_a_a, 0)
    buffer3.writeFloatBE(state.current_b_a, 4)
    buffer3.writeFloatBE(state.current_c_a, 8)
    buffer3.writeFloatBE(state.current_n_a, 12)
    buffer3.writeFloatBE(state.current_g_a, 16)
    buffer3.writeFloatBE(state.current_avg_a, 20)
    buffer3.writeFloatBE(state.current_unbalance_a_pct, 24)
    buffer3.writeFloatBE(state.current_unbalance_b_pct, 28)
    buffer3.writeFloatBE(state.current_unbalance_c_pct, 32)
    buffer3.writeFloatBE(state.current_unbalance_worst_pct, 36)
    buffer3.writeFloatBE(state.voltage_a_b_v, 40)
    buffer3.writeFloatBE(state.voltage_b_c_v, 44)
    buffer3.writeFloatBE(state.voltage_c_a_v, 48)
    buffer3.writeFloatBE(state.voltage_l_l_avg_v, 52)
    buffer3.writeFloatBE(state.voltage_a_n_v, 56)
    buffer3.writeFloatBE(state.voltage_b_n_v, 60)
    buffer3.writeFloatBE(state.voltage_c_n_v, 64)
    buffer3.writeFloatBE(state.voltage_l_n_avg_v, 72)
    buffer3.writeFloatBE(state.voltage_unbalance_a_b_pct, 76)
    buffer3.writeFloatBE(state.voltage_unbalance_b_c_pct, 80)
    buffer3.writeFloatBE(state.voltage_unbalance_c_a_pct, 84)
    buffer3.writeFloatBE(state.voltage_unbalance_l_l_worst_pct, 88)
    buffer3.writeFloatBE(state.voltage_unbalance_a_n_pct, 92)
    buffer3.writeFloatBE(state.voltage_unbalance_b_n_pct, 96)
    buffer3.writeFloatBE(state.voltage_unbalance_c_n_pct, 100)
    buffer3.writeFloatBE(state.voltage_unbalance_l_n_worst_pct, 104)
    buffer3.writeFloatBE(state.active_power_a_w, 108)
    buffer3.writeFloatBE(state.active_power_b_w, 112)
    buffer3.writeFloatBE(state.active_power_c_w, 116)
    buffer3.writeFloatBE(state.active_power_total_w, 120)
    buffer3.writeFloatBE(state.reactive_power_a_var, 124)
    buffer3.writeFloatBE(state.reactive_power_b_var, 128)
    buffer3.writeFloatBE(state.reactive_power_c_var, 132)
    buffer3.writeFloatBE(state.reactive_power_total_var, 136)
    buffer3.writeFloatBE(state.apparent_power_a_va, 140)
    buffer3.writeFloatBE(state.apparent_power_b_va, 144)
    buffer3.writeFloatBE(state.apparent_power_c_va, 148)
    buffer3.writeFloatBE(state.apparent_power_total_va, 152)
    buffer3.writeFloatBE(state.power_factor_a, 156)
    buffer3.writeFloatBE(state.power_factor_b, 160)
    buffer3.writeFloatBE(state.power_factor_c, 164)
    buffer3.writeFloatBE(state.power_factor_total, 168)
    buffer3.writeFloatBE(state.displacement_power_factor_a, 172)
    buffer3.writeFloatBE(state.displacement_power_factor_b, 176)
    buffer3.writeFloatBE(state.displacement_power_factor_c, 180)
    buffer3.writeFloatBE(state.displacement_power_factor_total, 184)
    buffer3.writeFloatBE(state.frequency_hz, 220)

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
