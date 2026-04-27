'use strict'

const { promiseTimeout } = require('@bitfinex/lib-js-util-promise')
const ABBPowerMeter = require('../abb.powermeter')
const { series } = require('async')
const { FUNCTION_CODES } = require('svc-facs-modbus/lib/constants')

class REU615PowerMeter extends ABBPowerMeter {
  async _readValues () {
    const instance = this
    return Buffer.concat(await promiseTimeout(series([
      async () => instance.client.read(FUNCTION_CODES.READ_HOLDING_REGISTERS, 1940, 2),
      async () => instance.client.read(FUNCTION_CODES.READ_HOLDING_REGISTERS, 1942, 2)
    ]), instance.opts.timeout))
  }

  async _prepSnap (readFromCache = false) {
    const data = readFromCache ? this.cache : await this.readValues()

    return {
      success: true,
      stats: {
        power_w: data.readInt32BE(0),
        voltage_v: data.readUInt32BE(4)
      },
      config: {}
    }
  }
}

module.exports = REU615PowerMeter
