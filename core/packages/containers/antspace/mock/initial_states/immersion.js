'use strict'

const { cleanup } = require('./stateUtils')
const { getRandomPower, createFaultFields, createMinerInfoEntries } = require('./utils')

module.exports = function (ctx) {
  const faultFieldNames = [
    'leakage_fault',
    'supply_liquid_temp_too_high',
    'supply_liquid_temp_high',
    'pump_alarm',
    'dry_cooler_power_fre_fault',
    'dry_cooler_fre_conv',
    'second_pump1_fault',
    'second_pump2_fault',
    'fan_fault',
    'phasefailure',
    'supply_liquid_temp_fault',
    'return_liquid_temp_fault',
    'power_distribution_Fault',
    'lever_sensor_fault',
    'smoke_sensor_fault',
    'return_liquid_temp_high',
    'return_liquid_temp_too_high',
    'power_distribution_temp_high',
    'lever_high',
    'lever_low'
  ]

  const state = {
    protocol_version: 5,
    disconnect: false,
    pid_mode: false,
    running_mode: false,
    ...createFaultFields(faultFieldNames, ctx.error),
    supply_liquid_set_temp: 0,
    longitude_direction: 0,
    longitude: 0,
    latitude_direction: 0,
    latitude: 0,
    pump_ready: false,
    pump_operation: false,
    pump_run: false,
    pump_start: false,
    server_on: false,
    one_pump: false,
    // Start in a running state so AntspaceImmersion._getStatus() returns RUNNING.
    second_pump1: true,
    second_pump2: true,
    dry_cooler_freq_run: false,
    dry_cooler_power_freq_run: false,
    container_fan: false,
    valve1_open: false,
    valve1_close: false,
    valve2_open: false,
    valve2_close: false,
    primary_circulating_pump: false,
    second_return_temp1: 0,
    second_supply_temp1: 0,
    second_return_temp2: 0,
    second_supply_temp2: 0,
    primary_supply_temp: 0,
    primary_return_temp: 0,
    out_temp: 0,
    container_temp: 0,
    container_humidity: 0,
    power_distribution_temp: 0,
    power_distribution_humidity: 0,
    tank_a_level: 0,
    tank_b_level: 0,
    tank_c_level: 0,
    tank_d_level: 0,
    drycooler_freq: 0,
    feedback_fre: 0,
    vol_a_distribution: 2233,
    vol_b_distribution: 2263,
    vol_c_distribution: 2263,
    cur_a_distribution: 0,
    cur_b_distribution: 0,
    cur_c_distribution: 0,
    distribution_box_power: getRandomPower(),
    open1: 0,
    open2: 0,
    power_distribution: 7.6733,
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
