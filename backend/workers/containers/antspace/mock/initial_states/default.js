'use strict'

const { cleanup } = require('./stateUtils')
const { getRandomPower, createFaultFields, createMinerInfoEntries } = require('./utils')

module.exports = (ctx) => {
  const faultFieldNames = [
    'power_fault',
    'liquid_level_low',
    'circulating_pump_fault',
    'fan1_fault',
    'fan2_fault',
    'fluid_infusion_pump_fault',
    'spray_pump_fault',
    'cooling_tower_fan1_fault',
    'cooling_tower_fan2_fault',
    'cooling_tower_fan3_fault',
    'leakage_fault',
    'supply_liquid_temp_high',
    'supply_liquid_temp_too_high',
    'supply_liquid_pressure_high',
    'return_liquid_pressure_low',
    'supply_liquid_flow_low',
    'freezing_alarm',
    'cooling_tower_liquid_level_low'
  ]

  const state = {
    disconnect: false,
    // Start in a running state so AntspaceHydro._getStatus() returns RUNNING.
    circulating_pump: true,
    fan1: false,
    fan2: true,
    spray_pump: true,
    fluid_infusion_pump: false,
    cooling_tower_fan1: true,
    cooling_tower_fan2: true,
    cooling_tower_fan3: true,
    ...createFaultFields(faultFieldNames, ctx.error),
    running_mode: false,
    supply_liquid_temp: 43,
    return_liquid_temp: 49,
    supply_liquid_pressure: 35,
    return_liquid_pressure: 28,
    colding_tower_inlet_temp: 26,
    antbox_internal_temp: 39,
    supply_liquid_flow: 29,
    antbox_internal_humidity: 54,
    distribution_box1_power: getRandomPower(),
    distribution_box2_power: getRandomPower(),
    longitude_direction: 0,
    longitude: 0,
    latitude_direction: 0,
    latitude: 0,
    supply_liquid_set_temp: 35,
    pid_mode: false,
    minerInfo: {
      miner_num: 120,
      total_hashrate: 12665.544871159516,
      pcb_max_temp: 98,
      chip_max_temp: 98,
      chip_temp_mean: 0,
      miner_info: createMinerInfoEntries()
    }
  }
  const clonedInitialState = JSON.parse(JSON.stringify(state))

  return { state, cleanup: cleanup.bind(null, state, clonedInitialState) }
}
