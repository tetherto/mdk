'use strict'

const { parallelLimit } = require('async')
const { RUNNING_STATUS } = require('../../../tpls/tpl-lib-container/lib/utils/constants')
const Antspace = require('./antspace')

const errorMap = {
  power_fault: ['power_fault'],
  liquid_level_low: ['liquid_level_low'],
  circulating_pump_fault: ['circulating_pump_fault'],
  fan1_fault: ['fan_fault', 'Exhaust fan 1 fault'],
  fan2_fault: ['fan_fault', 'Exhaust fan 2 fault'],
  fluid_infusion_pump_fault: ['fluid_infusion_pump_fault'],
  spray_pump_fault: ['spray_pump_fault'],
  cooling_tower_fan1_fault: ['cooling_tower_fan_fault', 'Cooling tower fan 1 fault'],
  cooling_tower_fan2_fault: ['cooling_tower_fan_fault', 'Cooling tower fan 2 fault'],
  cooling_tower_fan3_fault: ['cooling_tower_fan_fault', 'Cooling tower fan 3 fault'],
  leakage_fault: ['leakage_fault'],
  supply_liquid_temp_high: ['supply_liquid_temp_high'],
  supply_liquid_temp_too_high: ['supply_liquid_temp_too_high'],
  supply_liquid_pressure_high: ['supply_liquid_pressure_high'],
  return_liquid_pressure_low: ['return_liquid_pressure_low'],
  supply_liquid_flow_low: ['supply_liquid_flow_low'],
  freezing_alarm: ['freezing_alarm'],
  cooling_tower_liquid_level_low: ['cooling_tower_liquid_level_low']
}

class AntspaceHydro extends Antspace {
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

  _getStatus (isErrored, circulatingPump) {
    if (isErrored) return RUNNING_STATUS.ERROR
    if (circulatingPump) return RUNNING_STATUS.RUNNING
    return RUNNING_STATUS.STOPPED
  }

  async _prepSnap () {
    const res = await parallelLimit({
      systemData: this.getSystemData.bind(this),
      minerInfo: this.getMinerInfo.bind(this)
    }, 2)

    const { isErrored, errors } = this._prepErrors(res.systemData.data)

    return {
      stats: {
        status: this._getStatus(isErrored, res.systemData.data.circulating_pump),
        errors: isErrored ? errors : undefined,
        power_w: (res.systemData.data.distribution_box1_power + res.systemData.data.distribution_box2_power),
        distribution_box1_power_w: res.systemData.data.distribution_box1_power,
        distribution_box2_power_w: res.systemData.data.distribution_box2_power,
        alarm_status: res.systemData.data.freezing_alarm,
        ambient_temp_c: res.systemData.data.antbox_internal_temp,
        humidity_percent: res.systemData.data.antbox_internal_humidity,
        container_specific: {
          ...res.systemData.data,
          miner_info: res.minerInfo.data
        }
      },
      config: {
        container_specific: {
          supply_liquid_temp: res.systemData.data.supply_liquid_temp,
          colding_tower_inlet_temp: res.systemData.data.colding_tower_inlet_temp,
          running_mode: res.systemData.data.running_mode,
          supply_liquid_set_temp: res.systemData.data.supply_liquid_set_temp
        }
      }
    }
  }
}

module.exports = AntspaceHydro
