import { describe, expect, it } from 'vitest'

import { CURRENCY, HASHRATE_LABEL_DIVISOR, MAX_UNIT_VALUE, UNITS } from '../units'

describe('uNITS', () => {
  it('defines electrical units', () => {
    expect(UNITS.AMPERE).toBe('A')
    expect(UNITS.VOLTAGE_V).toBe('V')
    expect(UNITS.POWER_W).toBe('W')
    expect(UNITS.POWER_KW).toBe('kW')
  })

  it('defines energy units', () => {
    expect(UNITS.ENERGY_WH).toBe('Wh')
    expect(UNITS.ENERGY_KWH).toBe('kWh')
    expect(UNITS.ENERGY_MWH).toBe('MWh')
    expect(UNITS.ENERGY_GWH).toBe('GWh')
    expect(UNITS.ENERGY_MW).toBe('MW')
  })

  it('defines hashrate units', () => {
    expect(UNITS.HASHRATE_MH_S).toBe('MH/s')
    expect(UNITS.HASHRATE_TH_S).toBe('TH/s')
    expect(UNITS.HASHRATE_PH_S).toBe('PH/s')
    expect(UNITS.HASHRATE_EH_S).toBe('EH/s')
  })

  it('defines efficiency units', () => {
    expect(UNITS.EFFICIENCY_W_PER_TH).toBe('W/TH')
    expect(UNITS.EFFICIENCY_W_PER_TH_S).toBe('W/TH/S')
  })

  it('defines environmental units', () => {
    expect(UNITS.TEMPERATURE_C).toBe('°C')
    expect(UNITS.HUMIDITY_PERCENT).toBe('%RH')
    expect(UNITS.PRESSURE_BAR).toBe('bar')
    expect(UNITS.FLOW_M3H).toBe('m3/h')
  })

  it('defines percentage and frequency units', () => {
    expect(UNITS.PERCENT).toBe('%')
    expect(UNITS.FREQUENCY_HERTZ).toBe('Hz')
    expect(UNITS.APPARENT_POWER_KVA).toBe('kVA')
  })

  it('defines Bitcoin-related units', () => {
    expect(UNITS.SATS).toBe('Sats')
    expect(UNITS.VBYTE).toBe('vByte')
  })
})

describe('cURRENCY', () => {
  it('defines currency symbols', () => {
    expect(CURRENCY.BTC).toBe('₿')
    expect(CURRENCY.USD).toBe('$')
    expect(CURRENCY.EUR).toBe('€')
  })

  it('defines currency labels', () => {
    expect(CURRENCY.SAT_LABEL).toBe('SAT')
    expect(CURRENCY.BTC_LABEL).toBe('BTC')
    expect(CURRENCY.USD_LABEL).toBe('USD')
    expect(CURRENCY.SATS).toBe('Sats')
  })
})

describe('mAX_UNIT_VALUE', () => {
  it('defines maximum values for percentage-based units', () => {
    expect(MAX_UNIT_VALUE.HUMIDITY_PERCENT).toBe(100)
    expect(MAX_UNIT_VALUE.TEMPERATURE_PERCENT).toBe(100)
  })
})

describe('hASHRATE_LABEL_DIVISOR', () => {
  it('defines divisors for hashrate conversions', () => {
    expect(HASHRATE_LABEL_DIVISOR['MH/s']).toBe(1)
    expect(HASHRATE_LABEL_DIVISOR['GH/s']).toBe(1e3)
    expect(HASHRATE_LABEL_DIVISOR['TH/s']).toBe(1e6)
    expect(HASHRATE_LABEL_DIVISOR['PH/s']).toBe(1e9)
    expect(HASHRATE_LABEL_DIVISOR['EH/s']).toBe(1e12)
  })

  it('maintains correct scale relationships', () => {
    expect(HASHRATE_LABEL_DIVISOR['TH/s'] / HASHRATE_LABEL_DIVISOR['GH/s']).toBe(1000)
    expect(HASHRATE_LABEL_DIVISOR['PH/s'] / HASHRATE_LABEL_DIVISOR['TH/s']).toBe(1000)
    expect(HASHRATE_LABEL_DIVISOR['EH/s'] / HASHRATE_LABEL_DIVISOR['PH/s']).toBe(1000)
  })
})
