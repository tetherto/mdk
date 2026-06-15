'use strict'

const MAPPINGS = {
  m56: {
    '1-1': Array.from({ length: 14 }, (_, i) => `${i + 1}`),
    '1-2': Array.from({ length: 14 }, (_, i) => `${i + 1}`),
    '1-3': Array.from({ length: 14 }, (_, i) => `${i + 1}`),
    '1-4': Array.from({ length: 14 }, (_, i) => `${i + 1}`),
    '2-1': Array.from({ length: 14 }, (_, i) => `${i + 1}`),
    '2-2': Array.from({ length: 14 }, (_, i) => `${i + 1}`),
    '2-3': Array.from({ length: 14 }, (_, i) => `${i + 1}`),
    '2-4': Array.from({ length: 14 }, (_, i) => `${i + 1}`)
  },
  m30: {
    '1-1': ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'b1', 'b2', 'b3', 'b4', 'b5', 'c1', 'c2', 'c3', 'c4', 'c5'],
    '1-2': ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'b1', 'b2', 'b3', 'b4', 'b5', 'c1', 'c2', 'c3', 'c4', 'c5'],
    '1-3': ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'b1', 'b2', 'b3', 'b4', 'b5', 'c1', 'c2', 'c3', 'c4', 'c5'],
    '1-4': ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'b1', 'b2', 'b3', 'b4', 'b5', 'c1', 'c2', 'c3', 'c4', 'c5'],
    '2-1': ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'b1', 'b2', 'b3', 'b4', 'b5', 'c1', 'c2', 'c3', 'c4', 'c5'],
    '2-2': ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'b1', 'b2', 'b3', 'b4', 'b5', 'c1', 'c2', 'c3', 'c4', 'c5'],
    '2-3': ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'b1', 'b2', 'b3', 'b4', 'b5', 'c1', 'c2', 'c3', 'c4', 'c5'],
    '2-4': ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'b1', 'b2', 'b3', 'b4', 'b5', 'c1', 'c2', 'c3', 'c4', 'c5']
  },
  a1346: {
    '1-1': ['a1', 'a2', 'a3', 'a4', 'a5', 'b1', 'b2', 'b3', 'b4', 'c1', 'c2', 'c3', 'c4'],
    '1-2': ['a1', 'a2', 'a3', 'a4', 'a5', 'b1', 'b2', 'b3', 'b4', 'c1', 'c2', 'c3', 'c4'],
    '1-3': [null, 'a2', 'a3', 'a4', 'a5', 'b1', 'b2', 'b3', 'b4', 'c1', 'c2', 'c3', 'c4'],
    '1-4': [null, 'a2', 'a3', 'a4', 'a5', 'b1', 'b2', 'b3', 'b4', 'c1', 'c2', 'c3', 'c4'],
    '2-1': ['a1', 'a2', 'a3', 'a4', 'a5', 'b1', 'b2', 'b3', 'b4', 'c1', 'c2', 'c3', 'c4'],
    '2-2': ['a1', 'a2', 'a3', 'a4', 'a5', 'b1', 'b2', 'b3', 'b4', 'c1', 'c2', 'c3', 'c4'],
    '2-3': [null, 'a2', 'a3', 'a4', 'a5', 'b1', 'b2', 'b3', 'b4', 'c1', 'c2', 'c3', 'c4'],
    '2-4': [null, 'a2', 'a3', 'a4', 'a5', 'b1', 'b2', 'b3', 'b4', 'c1', 'c2', 'c3', 'c4']
  },
  s19xp: {
    '1-1': ['a1', 'a2', 'a3', 'a4', 'a5', 'b1', 'b2', 'b3', 'b4', 'c1', 'c2', 'c3', 'c4'],
    '1-2': ['a1', 'a2', 'a3', 'a4', 'a5', 'b1', 'b2', 'b3', 'b4', 'c1', 'c2', 'c3', 'c4'],
    '1-3': [null, 'a2', 'a3', 'a4', 'a5', 'b1', 'b2', 'b3', 'b4', 'c1', 'c2', 'c3', 'c4'],
    '1-4': [null, 'a2', 'a3', 'a4', 'a5', 'b1', 'b2', 'b3', 'b4', 'c1', 'c2', 'c3', 'c4'],
    '2-1': ['a1', 'a2', 'a3', 'a4', 'a5', 'b1', 'b2', 'b3', 'b4', 'c1', 'c2', 'c3', 'c4'],
    '2-2': ['a1', 'a2', 'a3', 'a4', 'a5', 'b1', 'b2', 'b3', 'b4', 'c1', 'c2', 'c3', 'c4'],
    '2-3': [null, 'a2', 'a3', 'a4', 'a5', 'b1', 'b2', 'b3', 'b4', 'c1', 'c2', 'c3', 'c4'],
    '2-4': [null, 'a2', 'a3', 'a4', 'a5', 'b1', 'b2', 'b3', 'b4', 'c1', 'c2', 'c3', 'c4']
  }
}

const ERROR_MAP = {
  'OilPump1 error': {
    name: 'oil_pump_error',
    message: 'Oil pump #1 has an error'
  },
  'OilPump2 error': {
    name: 'oil_pump_error',
    message: 'Oil pump #2 has an error'
  },
  'WaterPump1 error': {
    name: 'water_pump_error',
    message: 'Water pump #1 has an error'
  },
  'WaterPump2 error': {
    name: 'water_pump_error',
    message: 'Water pump #2 has an error'
  },
  'Tank1 hot oil overheat': {
    name: 'hot_oil_overheat',
    message: 'Tank #1 hot oil overheat'
  },
  'Tank1 cool oil overheat': {
    name: 'cold_oil_overheat',
    message: 'Tank #1 cold oil overheat'
  },
  'Tank1 hot water overheat': {
    name: 'hot_water_overheat',
    message: 'Tank #1 hot water overheat'
  },
  'Tank1 cool water overheat': {
    name: 'cold_water_overheat',
    message: 'Tank #1 cold water overheat'
  },
  'Tank2 hot oil overheat': {
    name: 'hot_oil_overheat',
    message: 'Tank #2 hot oil overheat'
  },
  'Tank2 cool oil overheat': {
    name: 'cold_oil_overheat',
    message: 'Tank #2 cold oil overheat'
  },
  'Tank2 hot water overheat': {
    name: 'hot_water_overheat',
    message: 'Tank #2 hot water overheat'
  },
  'Tank2 cool water overheat': {
    name: 'cold_water_overheat',
    message: 'Tank #2 cold water overheat'
  },
  'OilPump1 not running': {
    name: 'oil_pump_not_running',
    message: 'Oil pump #1 not running'
  },
  'OilPump2 not running': {
    name: 'oil_pump_not_running',
    message: 'Oil pump #2 not running'
  },
  'WaterPump1 not running': {
    name: 'water_pump_not_running',
    message: 'Water pump #1 not running'
  },
  'WaterPump2 not running': {
    name: 'water_pump_not_running',
    message: 'Water pump #2 not running'
  }
}

const PDU_SOCKET_POWER_ON = '7.0'
const PDU_SOCKET_CURRENT_ON = '10.1'
const PDU_SOCKET_POWER_OFF = '0.0'
const PDU_SOCKET_CURRENT_OFF = '0.0'

const DEVICE_TYPE_MAP = {
  D40_M56: 'm56',
  D40_M30: 'm30',
  D40_A1346: 'a1346',
  D40_S19xp: 's19xp'
}

const DEFAULT_MQTT_PORT = 10883

module.exports = {
  MAPPINGS,
  ERROR_MAP,
  PDU_SOCKET_POWER_ON,
  PDU_SOCKET_CURRENT_ON,
  PDU_SOCKET_POWER_OFF,
  PDU_SOCKET_CURRENT_OFF,
  DEVICE_TYPE_MAP,
  DEFAULT_MQTT_PORT
}
