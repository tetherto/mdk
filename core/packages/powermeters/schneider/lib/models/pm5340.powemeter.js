'use strict'

const { series } = require('async')
const { FUNCTION_CODES } = require('svc-facs-modbus/lib/constants')
const { promiseTimeout } = require('@bitfinex/lib-js-util-promise')
const SchneiderPowerMeter = require('../schneider')

class PM5340PowerMeter extends SchneiderPowerMeter {
  async _readValues () {
    const startRegister = 3000
    const totalRegisters = 112
    const chunkSize = 16
    const chunks = []

    for (let i = 0; i < totalRegisters; i += chunkSize) {
      const address = startRegister + i
      const count = Math.min(chunkSize, totalRegisters - i)
      chunks.push(async () => this.client.read(FUNCTION_CODES.READ_HOLDING_REGISTERS, address, count))
    }

    const results = await promiseTimeout(series(chunks), this.opts.timeout)
    const data = Buffer.concat(results)

    const powermeterSpecific = {
      instantaneous_values: this._prepInstantaneousValues(data)
    }

    const tension = this.calculateTension(
      powermeterSpecific.instantaneous_values.voltage_a_b_v,
      powermeterSpecific.instantaneous_values.voltage_b_c_v,
      powermeterSpecific.instantaneous_values.voltage_c_a_v
    )

    this.cache = {
      stats: {
        power_w: powermeterSpecific.instantaneous_values.active_power_total_w,
        tension_v: tension,
        powermeter_specific: powermeterSpecific
      },
      config: {}
    }
    return this.cache
  }

  _prepInstantaneousValues (data) {
    return {
      current_a_a: data.readFloatBE(0),
      current_b_a: data.readFloatBE(4),
      current_c_a: data.readFloatBE(8),
      current_n_a: data.readFloatBE(12),
      current_g_a: data.readFloatBE(16),
      current_avg_a: data.readFloatBE(20),
      current_unbalance_a_pct: data.readFloatBE(24),
      current_unbalance_b_pct: data.readFloatBE(28),
      current_unbalance_c_pct: data.readFloatBE(32),
      current_unbalance_worst_pct: data.readFloatBE(36),
      voltage_a_b_v: data.readFloatBE(40),
      voltage_b_c_v: data.readFloatBE(44),
      voltage_c_a_v: data.readFloatBE(48),
      voltage_l_l_avg_v: data.readFloatBE(52),
      voltage_a_n_v: data.readFloatBE(56),
      voltage_b_n_v: data.readFloatBE(60),
      voltage_c_n_v: data.readFloatBE(64),
      voltage_l_n_avg_v: data.readFloatBE(72),
      voltage_unbalance_a_b_pct: data.readFloatBE(76),
      voltage_unbalance_b_c_pct: data.readFloatBE(80),
      voltage_unbalance_c_a_pct: data.readFloatBE(84),
      voltage_unbalance_l_l_worst_pct: data.readFloatBE(88),
      voltage_unbalance_a_n_pct: data.readFloatBE(92),
      voltage_unbalance_b_n_pct: data.readFloatBE(96),
      voltage_unbalance_c_n_pct: data.readFloatBE(100),
      voltage_unbalance_l_n_worst_pct: data.readFloatBE(104),
      active_power_a_w: data.readFloatBE(108) * 1000,
      active_power_b_w: data.readFloatBE(112) * 1000,
      active_power_c_w: data.readFloatBE(116) * 1000,
      active_power_total_w: data.readFloatBE(120) * 1000,
      reactive_power_a_var: data.readFloatBE(124) * 1000,
      reactive_power_b_var: data.readFloatBE(128) * 1000,
      reactive_power_c_var: data.readFloatBE(132) * 1000,
      reactive_power_total_var: data.readFloatBE(136) * 1000,
      apparent_power_a_va: data.readFloatBE(140) * 1000,
      apparent_power_b_va: data.readFloatBE(144) * 1000,
      apparent_power_c_va: data.readFloatBE(148) * 1000,
      apparent_power_total_va: data.readFloatBE(152) * 1000,
      power_factor_a: data.readFloatBE(156),
      power_factor_b: data.readFloatBE(160),
      power_factor_c: data.readFloatBE(164),
      power_factor_total: data.readFloatBE(168),
      displacement_power_factor_a: data.readFloatBE(172),
      displacement_power_factor_b: data.readFloatBE(176),
      displacement_power_factor_c: data.readFloatBE(180),
      displacement_power_factor_total: data.readFloatBE(184),
      frequency_hz: data.readFloatBE(220)
    }
  }
}

module.exports = PM5340PowerMeter
