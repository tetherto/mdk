'use strict'

const { FUNCTION_CODES } = require('svc-facs-modbus/lib/constants')
const { promiseTimeout } = require('@bitfinex/lib-js-util-promise')
const SchneiderPowerMeter = require('../schneider')

class P3U30PowerMeter extends SchneiderPowerMeter {
  async _readValues () {
    const data = await promiseTimeout(
      this.client.read(FUNCTION_CODES.READ_HOLDING_REGISTERS, 2014, 11),
      this.opts.timeout
    )
    const powermeterSpecific = {
      instantaneous_values: this._prepInstantaneousValues(data)
    }

    const tension = this.calculateTension(
      powermeterSpecific.instantaneous_values.line_voltage_a_b_v,
      powermeterSpecific.instantaneous_values.line_voltage_b_c_v,
      powermeterSpecific.instantaneous_values.line_voltage_c_a_v
    )

    this.cache = {
      stats: {
        power_w: powermeterSpecific.instantaneous_values.active_power_w,
        tension_v: tension,
        powermeter_specific: powermeterSpecific
      },
      config: {}
    }
    return this.cache
  }

  _prepInstantaneousValues (data) {
    if (!data || !Buffer.isBuffer(data)) {
      throw new Error('ERR_DATA_INVALID: Expected a Buffer.')
    }
    if (data.length < 22) {
      throw new Error(
        `ERR_DATA_INSUFFICIENT: Expected 22 bytes but received ${data.length}.`
      )
    }
    return {
      line_voltage_a_b_v: data.readInt16BE(0),
      line_voltage_b_c_v: data.readInt16BE(2),
      line_voltage_c_a_v: data.readInt16BE(4),
      phase_voltage_a_v: data.readInt16BE(6),
      phase_voltage_b_v: data.readInt16BE(8),
      phase_voltage_c_v: data.readInt16BE(10),
      residual_voltage: data.readInt16BE(12),
      frequency_hz: data.readInt16BE(14),
      active_power_w: data.readInt16BE(16) * 1000,
      reactive_power_var: data.readInt16BE(18) * 1000,
      apparent_power_va: data.readInt16BE(20) * 1000
    }
  }
}

module.exports = P3U30PowerMeter
