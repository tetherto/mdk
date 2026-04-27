'use strict'

const { parallelLimit } = require('async')
const { RUNNING_STATUS } = require('../../../tpls/tpl-lib-container/lib/utils/constants')
const Antspace = require('./antspace')

const errorMap = {
  primary_circulating_pump: ['circulating_pump_fault'],
  dry_cooler_power_fre_fault: ['dry_cooler_power_fre_fault'],
  dry_cooler_fre_conv: ['dry_cooler_fre_conv'],
  second_pump1_fault: ['secondary_pump_fault', 'Secondary circulation pump 1 fault'],
  second_pump2_fault: ['secondary_pump_fault', 'Secondary circulation pump 2 fault'],
  fan_fault: ['fan_fault'],
  phasefailure: ['phase_failure'],
  supply_liquid_temp_fault: ['supply_liquid_temp_fault'],
  return_liquid_temp_fault: ['return_liquid_temp_fault'],
  power_distribution_Fault: ['power_distribution_fault'],
  lever_sensor_fault: ['lever_sensor_fault'],
  smoke_sensor_fault: ['smoke_sensor_fault'],
  return_liquid_temp_high: ['return_liquid_temp_high'],
  return_liquid_temp_too_high: ['return_liquid_temp_too_high'],
  power_distribution_temp_high: ['power_distribution_temp_high'],
  lever_high: ['lever_high'],
  lever_low: ['lever_low']
}

class AntspaceImmersion extends Antspace {
  _prepErrors (data) {
    const errors = []

    for (const [key, value] of Object.entries(errorMap)) {
      if (data[key]) {
        errors.push({
          name: value[0],
          message: value[1]
        })
      }
    }

    this._handleErrorUpdates(errors)

    return {
      isErrored: this._errorLog.length > 0,
      errors: this._errorLog
    }
  }

  _getStatus (isErrored, isRunning) {
    if (isErrored) return RUNNING_STATUS.ERROR
    if (isRunning) return RUNNING_STATUS.RUNNING
    return RUNNING_STATUS.STOPPED
  }

  async _prepSnap () {
    const res = await parallelLimit({
      systemData: this.getSystemData.bind(this),
      minerInfo: this.getMinerInfo.bind(this)
    }, 2)

    const { isErrored, errors } = this._prepErrors(res.systemData.data)
    const isRunning = res.systemData.data.second_pump1 || res.systemData.data.second_pump2

    return {
      stats: {
        status: this._getStatus(isErrored, isRunning),
        errors: isErrored ? errors : undefined,
        power_w: res.systemData.data.distribution_box_power * 100000,
        distribution_box_power_w: res.systemData.data.distribution_box_power * 100000,
        power_distribution_w: res.systemData.data.power_distribution * 1000,
        alarm_status: res.systemData.data.pump_alarm,
        ambient_temp_c: res.systemData.data.container_temp,
        humidity_percent: res.systemData.data.container_humidity,
        container_specific: {
          ...res.systemData.data,
          vol_a_distribution: Math.round(res.systemData.data.vol_a_distribution / 10),
          vol_b_distribution: Math.round(res.systemData.data.vol_b_distribution / 10),
          vol_c_distribution: Math.round(res.systemData.data.vol_c_distribution / 10),
          miner_info: res.minerInfo.data
        }
      },
      config: {
        container_specific: {
          running_mode: res.systemData.data.running_mode,
          pid_mode: res.systemData.data.pid_mode,
          supply_liquid_set_temp: res.systemData.data.supply_liquid_set_temp
        }
      }
    }
  }
}

module.exports = AntspaceImmersion
