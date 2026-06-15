'use strict'

const ABBPowerMeter = require('../abb.powermeter')
const { series } = require('async')
const { FUNCTION_CODES } = require('svc-facs-modbus/lib/constants')
const { promiseTimeout } = require('@bitfinex/lib-js-util-promise')

class M1M20PowerMeter extends ABBPowerMeter {
  async _readValues () {
    const instance = this
    return Buffer.concat(await promiseTimeout(series([
      async () => instance.client.read(FUNCTION_CODES.READ_HOLDING_REGISTERS, 23297, 24),
      async () => instance.client.read(FUNCTION_CODES.READ_HOLDING_REGISTERS, 51995, 10)
    ]), instance.opts.timeout))
  }

  async _prepSnap (readFromCache = false) {
    const data = readFromCache ? this.cache : await this.readValues()

    const powermeterSpecific = {
      v1_n_v: data.readUInt32BE(4) * 0.1,
      v2_n_v: data.readUInt32BE(8) * 0.1,
      v3_n_v: data.readUInt32BE(12) * 0.1,
      v1_v2_v: data.readUInt32BE(16) * 0.1,
      v2_v3_v: data.readUInt32BE(20) * 0.1,
      v3_v1_v: data.readUInt32BE(24) * 0.1,
      i1_a: data.readUInt32BE(32) * 0.01,
      i2_a: data.readUInt32BE(36) * 0.01,
      i3_a: data.readUInt32BE(40) * 0.01,
      in_a: data.readUInt32BE(44) * 0.01,
      active_power_total_w: data.readInt32BE(48),
      reactive_power_total_var: data.readInt32BE(64)
    }

    const tension = this.calculateTension(
      powermeterSpecific.v1_v2_v,
      powermeterSpecific.v2_v3_v,
      powermeterSpecific.v3_v1_v
    )

    return {
      success: true,
      stats: {
        power_w: powermeterSpecific.active_power_total_w,
        tension_v: tension,
        powermeter_specific: powermeterSpecific
      },
      config: {}
    }
  }
}

module.exports = M1M20PowerMeter
