'use strict'

const ErrorMap = {
  'R:1': 'hashrate_low',
  'N:1': 'hashrate_high',
  'V:1': 'power_init_error',
  'V:2': 'Ppower_supply_not_calibrated',
  'J0:8': 'insufficient_hashboards',
  'P:1': 'high_temp_protection',
  'P:2': 'low_temp_protection',
  'J1:4': 'eeprom_data_error',
  'J2:4': 'eeprom_data_error',
  'J3:4': 'eeprom_data_error',
  'J4:4': 'eeprom_data_error',
  'J5:4': 'eeprom_data_error',
  'J6:4': 'eeprom_data_error',
  'J7:4': 'eeprom_data_error',
  'J0:6': 'temp_sensor_error',
  'M:1': 'memory_malloc_error',
  'J0:2': 'chip_insufficient',
  'J1:2': 'chip_insufficient',
  'J2:2': 'chip_insufficient',
  'L0:1': 'voltage_freq_exceeds_limit',
  'L1:1': 'voltage_freq_exceeds_limit',
  'L2:1': 'voltage_freq_exceeds_limit',
  'L0:2': 'voltage_freq_mismatch',
  'L1:2': 'voltage_freq_mismatch',
  'L2:2': 'voltage_freq_mismatch',
  'L255:2': 'mixed_level_not_found'
}

module.exports = { ErrorMap }
