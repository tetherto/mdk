'use strict'

const PowerMeter = require('../../../tpls/tpl-lib-powermeter/lib/powermeter')
const { series } = require('async')
const { FUNCTION_CODES, PROTOCOL } = require('svc-facs-modbus/lib/constants')
const { promiseTimeout } = require('@bitfinex/lib-js-util-promise')
const {
  POWER_MULTIPLIER,
  ENG_LO,
  LO_ENG,
  THD_MULTIPLIER,
  POWER_FACTOR_MULTIPLIER,
  VOLTAGE_MULTIPLIER,
  CURRENT_MULTIPLIER
} = require('./utils/constants')

class SatecPowerMeter extends PowerMeter {
  constructor ({ getClient = null, ...opts }) {
    super(opts)
    if (!getClient) throw new Error('ERR_NO_CLIENT')
    this.client = getClient({
      address: this.opts.address,
      port: this.opts.port,
      unitId: this.opts.unitId,
      protocol: PROTOCOL.TCP,
      timeout: this.opts.timeout
    })
    this.collectSnapsItvMs = opts.collectSnapsItvMs
    this.last15mPowerBufferSize = Math.floor((15 * 60 * 1000) / this.collectSnapsItvMs) // Calculate buffer size for 15 minutes
    this.last15mPowerBuffer = new Array(this.last15mPowerBufferSize).fill(null)
    this.bufferIndex = 0
  }

  close () {
    this.client.end()
  }

  async readValues () {
    this.cache = Buffer.concat(await promiseTimeout(series([
      async () => this.client.read(FUNCTION_CODES.READ_HOLDING_REGISTERS, 257, 6),
      async () => this.client.read(FUNCTION_CODES.READ_HOLDING_REGISTERS, 272, 7),
      async () => this.client.read(FUNCTION_CODES.READ_HOLDING_REGISTERS, 296, 6)
    ]), this.opts.timeout))
    return this.cache
  }

  _storePowerInBuffer (powerW) {
    this.last15mPowerBuffer[this.bufferIndex] = powerW
    this.bufferIndex = (this.bufferIndex + 1) % this.last15mPowerBufferSize
  }

  _calculate15MinAvg () {
    const validReadings = this.last15mPowerBuffer.filter(reading => reading !== null)
    const sum = validReadings.reduce((acc, val) => acc + val, 0)
    return validReadings.length > 0 ? sum / validReadings.length : 0
  }

  async _prepSnap (readFromCache = false) {
    const data = readFromCache ? this.cache : await this.readValues()
    const instantaneousValues = this._prepInstantaneousValues(data)
    const currentPowerW = instantaneousValues.real_import_power_w
    this._storePowerInBuffer(currentPowerW)

    const powermeterSpecific = {
      instantaneous_values: instantaneousValues,
      historical_values: {
        real_import_power_w_last15m_avg: this._calculate15MinAvg()
      }
    }

    const tension = this.calculateTension(
      powermeterSpecific.instantaneous_values.voltage_v1_v12_v,
      powermeterSpecific.instantaneous_values.voltage_v2_v23_v,
      powermeterSpecific.instantaneous_values.voltage_v3_v31_v
    )

    return {
      success: true,
      stats: {
        power_w: powermeterSpecific.instantaneous_values.real_import_power_w,
        tension_v: tension,
        powermeter_specific: powermeterSpecific
      },
      config: {}
    }
  }

  _prepInstantaneousValues (data) {
    if (!data || !Buffer.isBuffer(data)) {
      throw new Error('ERR_DATA_INVALID: Expected a Buffer.')
    }
    if (data.length < 38) {
      throw new Error(`ERR_DATA_INSUFFICIENT: Expected 38 bytes but received ${data.length}.`)
    }

    return {
      voltage_v1_v12_v: Math.max(data.readInt16BE(0) * VOLTAGE_MULTIPLIER, 0),
      voltage_v2_v23_v: Math.max(data.readUInt16BE(2) * VOLTAGE_MULTIPLIER, 0),
      voltage_v3_v31_v: Math.max(data.readInt16BE(4) * VOLTAGE_MULTIPLIER, 0),
      current_i1_a: Math.max(data.readInt16BE(6) * CURRENT_MULTIPLIER, 0),
      current_i2_a: Math.max(data.readUInt16BE(8) * CURRENT_MULTIPLIER, 0),
      current_i3_a: Math.max(data.readInt16BE(10) * CURRENT_MULTIPLIER, 0),
      power_factor_l1: Math.max((data.readInt16BE(12) * POWER_FACTOR_MULTIPLIER) + LO_ENG, 0),
      power_factor_l2: Math.max((data.readInt16BE(14) * POWER_FACTOR_MULTIPLIER) + LO_ENG, 0),
      power_factor_l3: Math.max((data.readInt16BE(16) * POWER_FACTOR_MULTIPLIER) + LO_ENG, 0),
      real_import_power_w: Math.max((data.readInt16BE(20) * POWER_MULTIPLIER) + ENG_LO, 0) * 1000, // multiplied by 1000 to convert from kW to W
      reactive_power_k_var: Math.max((data.readUInt16BE(22) * POWER_MULTIPLIER) + ENG_LO, 0),
      apparent_import_power_kva: Math.max((data.readInt16BE(24) * POWER_MULTIPLIER) + ENG_LO, 0),
      voltage_1_2_thd: Math.max(data.readUInt16BE(26) * THD_MULTIPLIER, 0),
      voltage_2_3_thd: Math.max(data.readUInt16BE(28) * THD_MULTIPLIER, 0),
      voltage_3_1_thd: Math.max(data.readUInt16BE(30) * THD_MULTIPLIER, 0),
      current_i1_thd: Math.max(data.readUInt16BE(32) * THD_MULTIPLIER, 0),
      current_i2_thd: Math.max(data.readUInt16BE(34) * THD_MULTIPLIER, 0),
      current_i3_thd: Math.max(data.readUInt16BE(36) * THD_MULTIPLIER, 0)
    }
  }
}

module.exports = SatecPowerMeter
