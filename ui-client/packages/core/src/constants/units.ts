export const UNITS = {
  AMPERE: 'A',
  POWER_W: 'W',
  PERCENT: '%',
  SATS: 'Sats',
  VBYTE: 'vByte',
  POWER_KW: 'kW',
  ENERGY_WH: 'Wh',
  VOLTAGE_V: 'V',
  ENERGY_MW: 'MW',
  FLOW_M3H: 'm3/h',
  ENERGY_MWH: 'MWh',
  ENERGY_GWH: 'GWh',
  ENERGY_KWH: 'kWh',
  TEMPERATURE_C: '°C',
  PRESSURE_BAR: 'bar',
  HASHRATE_TH_S: 'TH/s',
  HASHRATE_PH_S: 'PH/s',
  HASHRATE_EH_S: 'EH/s',
  HASHRATE_MH_S: 'MH/s',
  FREQUENCY_MHZ: 'MHz',
  FREQUENCY_HERTZ: 'Hz',
  HUMIDITY_PERCENT: '%RH',
  APPARENT_POWER_KVA: 'kVA',
  EFFICIENCY_W_PER_TH: 'W/TH',
  EFFICIENCY_W_PER_TH_S: 'W/TH/S',
  FLOW_M3H_UNICODE: 'm³/h',
} as const

export const CURRENCY = {
  BTC: '₿',
  USD: '$',
  EUR: '€',
  SATS: 'Sats',
  SAT_LABEL: 'SAT',
  BTC_LABEL: 'BTC',
  USD_LABEL: 'USD',
} as const

export const MAX_UNIT_VALUE = {
  HUMIDITY_PERCENT: 100,
  TEMPERATURE_PERCENT: 100,
} as const

export const HASHRATE_LABEL_DIVISOR = {
  'MH/s': 1,
  'TH/s': 1e6,
  'PH/s': 1e9,
  'GH/s': 1e3,
  'EH/s': 1e12,
} as const

// Type exports
export type UnitKey = keyof typeof UNITS
export type UnitValue = (typeof UNITS)[UnitKey]
export type CurrencyKey = keyof typeof CURRENCY
export type CurrencyValue = (typeof CURRENCY)[CurrencyKey]
export type MaxUnitValueKey = keyof typeof MAX_UNIT_VALUE
export type MaxUnitValueValue = (typeof MAX_UNIT_VALUE)[MaxUnitValueKey]
export type HashrateLabelDivisorKey = keyof typeof HASHRATE_LABEL_DIVISOR
export type HashrateLabelDivisorValue = (typeof HASHRATE_LABEL_DIVISOR)[HashrateLabelDivisorKey]
