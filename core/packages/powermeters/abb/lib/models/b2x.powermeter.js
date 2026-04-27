'use strict'

const ABBPowerMeter = require('../abb.powermeter')
const { series } = require('async')
const { buildAlarmConfig, parseAlarmConfig } = require('../utils')
const { FUNCTION_CODES } = require('svc-facs-modbus/lib/constants')
const { promiseTimeout } = require('@bitfinex/lib-js-util-promise')

class B2XPowerMeter extends ABBPowerMeter {
  async _readValues () {
    const startRegister = 23297
    const totalRegisters = 30
    const chunkSize = 15
    const chunks = []

    for (let i = 0; i < totalRegisters; i += chunkSize) {
      const address = startRegister + i
      const count = Math.min(chunkSize, totalRegisters - i)
      chunks.push(async () => this.client.read(FUNCTION_CODES.READ_HOLDING_REGISTERS, address, count))
    }

    const results = await promiseTimeout(series(chunks), this.opts.timeout)

    return Buffer.concat(results)
  }

  async _prepSnap (readFromCache = false) {
    const data = readFromCache ? this.cache : await this.readValues()

    const powermeterSpecific = {
      v1_n_v: data.readUInt32BE(0) * 0.1,
      v2_n_v: data.readUInt32BE(4) * 0.1,
      v3_n_v: data.readUInt32BE(8) * 0.1,
      v1_v2_v: data.readUInt32BE(12) * 0.1,
      v2_v3_v: data.readUInt32BE(16) * 0.1,
      v1_v3_v: data.readUInt32BE(20) * 0.1,
      i1_a: data.readUInt32BE(24) * 0.01,
      i2_a: data.readUInt32BE(28) * 0.01,
      i3_a: data.readUInt32BE(32) * 0.01,
      in_a: data.readUInt32BE(36) * 0.01,
      active_power_total_w: data.readInt32BE(40) * 0.01,
      reactive_power_total_var: data.readInt32BE(56) * 0.01
    }

    const tension = this.calculateTension(
      powermeterSpecific.v1_v2_v,
      powermeterSpecific.v2_v3_v,
      powermeterSpecific.v1_v3_v
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

  async resetPowerFailCounter () {
    await this.client.write('hr36608', Buffer.from([0x01]))
    return {
      success: true
    }
  }

  async resetPowerOutageTime () {
    await this.client.write('hr36613', Buffer.from([0x01]))
    return {
      success: true
    }
  }

  async resetSystemLog () {
    await this.client.write('hr36657', Buffer.from([0x01]))
    return {
      success: true
    }
  }

  async resetEventLog () {
    await this.client.write('hr36658', Buffer.from([0x01]))
    return {
      success: true
    }
  }

  async resetNetQualityLog () {
    await this.client.write('hr36659', Buffer.from([0x01]))
    return {
      success: true
    }
  }

  async setAlarmConfig (alarmConfig) {
    const packets = buildAlarmConfig(alarmConfig)
    await series([
      async () => this.client.write('hr35936', packets[0]),
      async () => this.client.write('hr35937', packets[1]),
      async () => this.client.write('hr35940', packets[2]),
      async () => this.client.write('hr35948', packets[3]),
      async () => this.client.write('hr35952', packets[4])
    ])

    return {
      success: true
    }
  }

  async getAlarmConfig (index) {
    const packets = await series([
      async () => {
        this.client.write('hr35936', Buffer.from([index]))
        return Buffer.from([index])
      },
      async () => this.client.read('hr35937-35939'),
      async () => this.client.read('hr35940-35947'),
      async () => this.client.read('hr35948-35951'),
      async () => this.client.read('hr35952-35954')
    ])

    return {
      success: true,
      alarm_config: parseAlarmConfig(packets)
    }
  }
}

module.exports = B2XPowerMeter
