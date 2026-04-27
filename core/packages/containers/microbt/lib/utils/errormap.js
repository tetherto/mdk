'use strict'

const SystemErrorMap = {
  0: 'low_inlet_pressure_circ_pump',
  1: 'low_outlet_pressure_circ_pump',
  2: 'high_outlet_pressure_circ_pump',
  3: 'circulating_pump_fault',
  4: 'circ_pump_inverter_fault',
  5: 'high_pressure_diff_filter',
  6: 'small_inlet_outlet_pressure_diff',
  7: 'large_inlet_outlet_pressure_diff',
  8: 'high_inlet_temp_unit',
  9: 'high_outlet_temp_unit',
  10: 'small_temp_dew_point_diff_inlet_unit',
  11: 'circ_pump_inlet_pressure_sensor_fault',
  12: 'circ_pump_outlet_pressure_sensor_fault',
  13: 'unit_inlet_temp_sensor_fault',
  14: 'unit_outlet_temp_sensor_fault',
  15: 'unit_inlet_pressure_sensor_fault',
  16: 'unit_outlet_pressure_sensor_fault',
  17: 'filter_front_pressure_sensor_fault',
  18: 'filter_rear_pressure_sensor_fault',
  19: 'bypass_valve_fault',
  20: 'fan_fault',
  21: 'temp_sensor_chilled_water_supply_fault',
  22: 'temp_sensor_chilled_water_supply_fault',
  23: 'pressure_sensor_chilled_water_supply_fault',
  24: 'circ_pump_high_inlet_pressure'
}

const GeneralErrorMap = {
  0: 'outdoor_ambient_temp_sensor_fault',
  1: 'indoor_temp_humidity_sensor_fault',
  2: 'makeup_water_pump_fault',
  3: 'power_fault',
  4: 'water_immersion_alarm'
}

module.exports = {
  SystemErrorMap,
  GeneralErrorMap
}
