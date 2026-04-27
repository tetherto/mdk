/* eslint-disable ts/ban-ts-comment */
import { HEATMAP, UNITS } from '@mdk/core'
import { describe, expect, it } from 'vitest'
import { MINER_TYPE } from '../../constants/device-constants'
import type { Device } from '../../types/device'
import {
  appendContainerToTag,
  appendIdToTag,
  appendIdToTags,
  formatPowerConsumption,
  getCabinetTitle,
  getConfig,
  getContainerSpecificStats,
  getDeviceData,
  getHashrateString,
  getHashrateUnit,
  getIsMinerPowerReadingAvailable,
  getLast,
  getLvCabinetTempSensorColor,
  getLvCabinetTitle,
  getMinerName,
  getMinerShortCode,
  getOnOffText,
  getPowerModeColor,
  getRackNameFromId,
  getRootTempSensorTempValue,
  getSnap,
  getStats,
  getSupportedPowerModes,
  getTableDeviceData,
  getTemperatureColor,
  getTransformerCabinetTitle,
  isAntminer,
  isAvalon,
  isContainer,
  isMiner,
  isMinerOffline,
  isTransformerCabinet,
  isWhatsminer,
  megaToTera,
  PowerModeColors,
  removeContainerPrefix,
} from '../device-utils'
import { MINER_POWER_MODE } from '../status-utils'

describe('device utils', () => {
  describe('formatHashRate', () => {
    it('should calculate properly', () => {
      expect(getHashrateUnit(0)).toEqual({ unit: 'MH/s', value: 0, realValue: 0 })
      expect(getHashrateUnit(0, 2, null, true)).toEqual({ unit: '', value: null, realValue: 0 })

      expect(getHashrateUnit(1)).toEqual({ unit: 'MH/s', value: 1, realValue: 1 })
      expect(getHashrateUnit(10)).toEqual({ unit: 'MH/s', value: 10, realValue: 10 })
      expect(getHashrateUnit(100)).toEqual({ unit: 'MH/s', value: 100, realValue: 100 })

      expect(getHashrateUnit(1.5789)).toEqual({ unit: 'MH/s', value: 1.58, realValue: 1.5789 })
      expect(getHashrateUnit(10.54987)).toEqual({ unit: 'MH/s', value: 10.55, realValue: 10.54987 })
      expect(getHashrateUnit(100.458798794)).toEqual({
        unit: 'MH/s',
        value: 100.46,
        realValue: 100.458798794,
      })

      expect(getHashrateUnit(1_000)).toEqual({ unit: 'GH/s', value: 1, realValue: 1_000 })
      expect(getHashrateUnit(10_000)).toEqual({ unit: 'GH/s', value: 10, realValue: 10_000 })
      expect(getHashrateUnit(100_000)).toEqual({ unit: 'GH/s', value: 100, realValue: 100_000 })

      expect(getHashrateUnit(1_000.98977)).toEqual({
        unit: 'GH/s',
        value: 1,
        realValue: 1_000.98977,
      })
      expect(getHashrateUnit(10_000.44477)).toEqual({
        unit: 'GH/s',
        value: 10,
        realValue: 10_000.44477,
      })
      expect(getHashrateUnit(15_427.44477)).toEqual({
        unit: 'GH/s',
        value: 15.43,
        realValue: 15_427.44477,
      })
      expect(getHashrateUnit(137_557.199887)).toEqual({
        unit: 'GH/s',
        value: 137.56,
        realValue: 137_557.199887,
      })

      expect(getHashrateUnit(1_000_000)).toEqual({ unit: 'TH/s', value: 1, realValue: 1_000_000 })
      expect(getHashrateUnit(10_000_000)).toEqual({
        unit: 'TH/s',
        value: 10,
        realValue: 10_000_000,
      })
      expect(getHashrateUnit(100_000_000)).toEqual({
        unit: 'TH/s',
        value: 100,
        realValue: 100_000_000,
      })

      expect(getHashrateUnit(1_557_000)).toEqual({
        unit: 'TH/s',
        value: 1.56,
        realValue: 1_557_000,
      })
      expect(getHashrateUnit(10_981_000)).toEqual({
        unit: 'TH/s',
        value: 10.98,
        realValue: 10_981_000,
      })
      expect(getHashrateUnit(100_144_000)).toEqual({
        unit: 'TH/s',
        value: 100.14,
        realValue: 100_144_000,
      })

      expect(getHashrateUnit(1_000_000_000)).toEqual({
        unit: 'PH/s',
        value: 1,
        realValue: 1_000_000_000,
      })
      expect(getHashrateUnit(10_000_000_000)).toEqual({
        unit: 'PH/s',
        value: 10,
        realValue: 10_000_000_000,
      })
      expect(getHashrateUnit(100_000_000_000)).toEqual({
        unit: 'PH/s',
        value: 100,
        realValue: 100_000_000_000,
      })

      expect(getHashrateUnit(1_669_474_000)).toEqual({
        unit: 'PH/s',
        value: 1.67,
        realValue: 1_669_474_000,
      })
      expect(getHashrateUnit(11_656_000_000)).toEqual({
        unit: 'PH/s',
        value: 11.66,
        realValue: 11_656_000_000,
      })
      expect(getHashrateUnit(995_427_000_000)).toEqual({
        unit: 'PH/s',
        value: 995.43,
        realValue: 995_427_000_000,
      })

      expect(getHashrateUnit(1_669_474_000_000)).toEqual({
        unit: 'EH/s',
        value: 1.67,
        realValue: 1_669_474_000_000,
      })
      expect(getHashrateUnit(11_656_000_000_000)).toEqual({
        unit: 'EH/s',
        value: 11.66,
        realValue: 11_656_000_000_000,
      })
      expect(getHashrateUnit(995_427_000_000_000)).toEqual({
        unit: 'EH/s',
        value: 995.43,
        realValue: 995_427_000_000_000,
      })
    })
  })

  describe('formatPowerConsumption', () => {
    describe('auto-selection behavior (default, no forceUnit)', () => {
      it('should return watts for values less than 1000', () => {
        expect(formatPowerConsumption(0)).toEqual({
          value: 0,
          unit: UNITS.POWER_W,
          realValue: 0,
        })
        expect(formatPowerConsumption(100)).toEqual({
          value: 100,
          unit: UNITS.POWER_W,
          realValue: 100,
        })
        expect(formatPowerConsumption(999)).toEqual({
          value: 999,
          unit: UNITS.POWER_W,
          realValue: 999,
        })
      })

      it('should return kW for values between 1000 and 999999', () => {
        expect(formatPowerConsumption(1000)).toEqual({
          value: 1,
          unit: UNITS.POWER_KW,
          realValue: 1000,
        })
        expect(formatPowerConsumption(5000)).toEqual({
          value: 5,
          unit: UNITS.POWER_KW,
          realValue: 5000,
        })
        expect(formatPowerConsumption(999999)).toEqual({
          value: 999.999,
          unit: UNITS.POWER_KW,
          realValue: 999999,
        })
      })

      it('should return MW for values >= 1000000', () => {
        expect(formatPowerConsumption(1000000)).toEqual({
          value: 1,
          unit: UNITS.ENERGY_MW,
          realValue: 1000000,
        })
        expect(formatPowerConsumption(5000000)).toEqual({
          value: 5,
          unit: UNITS.ENERGY_MW,
          realValue: 5000000,
        })
        expect(formatPowerConsumption(15000000)).toEqual({
          value: 15,
          unit: UNITS.ENERGY_MW,
          realValue: 15000000,
        })
      })

      it('should handle negative values correctly', () => {
        expect(formatPowerConsumption(-100)).toEqual({
          value: -100,
          unit: UNITS.POWER_W,
          realValue: -100,
        })
        expect(formatPowerConsumption(-5000)).toEqual({
          value: -5,
          unit: UNITS.POWER_KW,
          realValue: -5000,
        })
        expect(formatPowerConsumption(-2000000)).toEqual({
          value: -2,
          unit: UNITS.ENERGY_MW,
          realValue: -2000000,
        })
      })
    })

    describe('forced unit conversion', () => {
      it('should force MW conversion regardless of value', () => {
        expect(formatPowerConsumption(100, UNITS.ENERGY_MW)).toEqual({
          value: 0.0001,
          unit: UNITS.ENERGY_MW,
          realValue: 100,
        })
        expect(formatPowerConsumption(5000, UNITS.ENERGY_MW)).toEqual({
          value: 0.005,
          unit: UNITS.ENERGY_MW,
          realValue: 5000,
        })
        expect(formatPowerConsumption(2000000, UNITS.ENERGY_MW)).toEqual({
          value: 2,
          unit: UNITS.ENERGY_MW,
          realValue: 2000000,
        })
      })

      it('should force kW conversion regardless of value', () => {
        expect(formatPowerConsumption(100, UNITS.POWER_KW)).toEqual({
          value: 0.1,
          unit: UNITS.POWER_KW,
          realValue: 100,
        })
        expect(formatPowerConsumption(5000, UNITS.POWER_KW)).toEqual({
          value: 5,
          unit: UNITS.POWER_KW,
          realValue: 5000,
        })
        expect(formatPowerConsumption(2000000, UNITS.POWER_KW)).toEqual({
          value: 2000,
          unit: UNITS.POWER_KW,
          realValue: 2000000,
        })
      })

      it('should force W conversion regardless of value', () => {
        expect(formatPowerConsumption(100, UNITS.POWER_W)).toEqual({
          value: 100,
          unit: UNITS.POWER_W,
          realValue: 100,
        })
        expect(formatPowerConsumption(5000, UNITS.POWER_W)).toEqual({
          value: 5000,
          unit: UNITS.POWER_W,
          realValue: 5000,
        })
        expect(formatPowerConsumption(2000000, UNITS.POWER_W)).toEqual({
          value: 2000000,
          unit: UNITS.POWER_W,
          realValue: 2000000,
        })
      })
    })

    describe('edge cases', () => {
      it('should handle non-finite values', () => {
        // @ts-ignore
        expect(formatPowerConsumption(null)).toEqual({
          value: null,
          unit: '',
          realValue: null,
        })
        // @ts-ignore
        expect(formatPowerConsumption(undefined)).toEqual({
          value: null,
          unit: '',
          realValue: undefined,
        })
        expect(formatPowerConsumption(Number.NaN)).toEqual({
          value: null,
          unit: '',
          realValue: Number.NaN,
        })
        expect(formatPowerConsumption(Infinity)).toEqual({
          value: null,
          unit: '',
          realValue: Infinity,
        })
        expect(formatPowerConsumption(-Infinity)).toEqual({
          value: null,
          unit: '',
          realValue: -Infinity,
        })
      })

      it('should handle boundary values', () => {
        expect(formatPowerConsumption(999)).toEqual({
          value: 999,
          unit: UNITS.POWER_W,
          realValue: 999,
        })
        expect(formatPowerConsumption(1000)).toEqual({
          value: 1,
          unit: UNITS.POWER_KW,
          realValue: 1000,
        })
        expect(formatPowerConsumption(999999)).toEqual({
          value: 999.999,
          unit: UNITS.POWER_KW,
          realValue: 999999,
        })
        expect(formatPowerConsumption(1000000)).toEqual({
          value: 1,
          unit: UNITS.ENERGY_MW,
          realValue: 1000000,
        })
      })

      it('should preserve realValue when forcing unit', () => {
        const result = formatPowerConsumption(5000, UNITS.ENERGY_MW)
        expect(result.realValue).toBe(5000)
        expect(result.value).toBe(0.005)
        expect(result.unit).toBe(UNITS.ENERGY_MW)
      })
    })
  })

  describe('isMinerOffline', () => {
    it('should detect status properly', () => {
      expect(
        isMinerOffline({
          last: {
            snap: {
              stats: {
                status: 'offline',
              },
              config: {
                key1: 'val1',
              },
            },
          },
        }),
      ).toBe(true)

      expect(
        isMinerOffline({
          last: {
            snap: {
              stats: {
                status: 'other',
              },
              config: {
                key1: 'val1',
              },
            },
          },
        }),
      ).toBe(false)
    })

    it('should detect status properly when no config', () => {
      expect(
        isMinerOffline({
          last: {
            snap: {
              stats: {
                status: 'offline',
              },
              config: {},
            },
          },
        }),
      ).toBe(true)

      expect(
        isMinerOffline({
          last: {
            snap: {
              stats: {
                status: 'offline',
              },
            },
          },
        }),
      ).toBe(true)
    })

    it('should detect status when no stats', () => {
      expect(
        isMinerOffline({
          last: {
            snap: {
              config: {
                key1: 'val1',
              },
            },
          },
        }),
      ).toBe(false)

      expect(
        isMinerOffline({
          last: {
            snap: {
              stats: {},
              config: {
                key1: 'val1',
              },
            },
          },
        }),
      ).toBe(false)
    })

    it('should detect status when no stats and no config', () => {
      expect(
        isMinerOffline({
          last: {
            snap: {},
          },
        }),
      ).toBe(true)
    })
  })

  describe('getHashrateString', () => {
    it('should return formatted hashrate', () => {
      const cases: Record<number, string> = {
        1e6: '1 TH/s',
        6e6: '6 TH/s',
        6e5: '600 GH/s',
        6e2: '600 MH/s',
        6e1: '60 MH/s',
        6.6e1: '66 MH/s',
      }
      for (const testCase in cases) {
        if (!Object.hasOwn(cases, testCase)) continue

        const expected = cases[testCase]
        expect(getHashrateString(Number.parseInt(testCase))).toBe(expected)
      }
    })

    it('should treat 0 as no data', () => {
      expect(getHashrateString(0, true)).toBe('-')
    })

    it('should treat 0 as data', () => {
      expect(getHashrateString(0)).toBe('0 MH/s')
    })
  })

  describe('megaToTera', () => {
    it('should format properly', () => {
      const cases: Record<number, number> = {
        1e6: 1,
        6e6: 6,
        6e5: 0.6,
        6.3e5: 0.63,
      }

      for (const testCase in cases) {
        if (!Object.hasOwn(cases, testCase)) continue

        const expected = cases[testCase]
        expect(megaToTera(Number.parseInt(testCase))).toBe(expected)
      }
    })
  })

  describe('getOnOffText', () => {
    it('should return correct text', () => {
      expect(getOnOffText(true)).toBe('On')
      expect(getOnOffText(false)).toBe('Off')
      expect(getOnOffText(null)).toBe('-')
      expect(getOnOffText(null, 'x')).toBe('x')
    })
  })

  describe('cabinet utils', () => {
    it('should detect transformer cabinet', () => {
      expect(isTransformerCabinet({ id: 'tr-1' })).toBe(true)
      expect(isTransformerCabinet({ id: 'tr-cabinet-01' })).toBe(true)
      expect(isTransformerCabinet({ id: 'lv-1' })).toBe(false)
      expect(isTransformerCabinet({ id: 'cabinet' })).toBe(false)
    })

    it('should get transformer cabinet title', () => {
      expect(
        getTransformerCabinetTitle({ id: 'tr-1', connectedDevices: ['c-1', 'c-2'] }),
      ).toContain('TR')
      expect(getTransformerCabinetTitle({ id: 'tr-01' })).toContain('TR')
    })

    it('should get LV cabinet title', () => {
      expect(getLvCabinetTitle({ id: 'lv-1' })).toBe('LV Cabinet -1')
      expect(getLvCabinetTitle({ id: 'lv-cabinet-02' })).toContain('LV Cabinet')
    })

    it('should get correct cabinet title based on type', () => {
      expect(getCabinetTitle({ id: 'tr-1' })).toContain('TR')
      expect(getCabinetTitle({ id: 'lv-1' })).toContain('LV Cabinet')
    })

    it('should get LV cabinet temp sensor color', () => {
      expect(getLvCabinetTempSensorColor(75)).toBeTruthy()
      expect(getLvCabinetTempSensorColor(65)).toBeTruthy()
      expect(getLvCabinetTempSensorColor(50)).toBe('')
    })
  })

  describe('device data accessors', () => {
    it('should get last data', () => {
      expect(getLast({ last: { value: 1 } })).toEqual({ value: 1 })
      expect(getLast({})).toEqual({})
      expect(getLast({ other: 'data' })).toEqual({})
    })

    it('should get snap data', () => {
      expect(getSnap({ last: { snap: { temp: 50 } } })).toEqual({ temp: 50 })
      expect(getSnap({})).toEqual({})
    })

    it('should get stats data', () => {
      expect(getStats({ last: { snap: { stats: { power: 100 } } } })).toEqual({ power: 100 })
      expect(getStats({})).toEqual({})
    })

    it('should get config data', () => {
      expect(getConfig({ last: { snap: { config: { mode: 'high' } } } })).toEqual({ mode: 'high' })
      expect(getConfig({})).toEqual({})
    })

    it('should get root temp sensor value', () => {
      const device = {
        rootTempSensor: {
          last: {
            snap: {
              stats: { temp_c: 45.5 },
            },
          },
        },
      }
      expect(getRootTempSensorTempValue(device)).toBe(45.5)
      expect(getRootTempSensorTempValue({})).toBeUndefined()
    })
  })

  describe('power mode', () => {
    it('should have power mode colors', () => {
      expect(PowerModeColors.sleep).toBeDefined()
      expect(PowerModeColors.low).toBeDefined()
      expect(PowerModeColors.normal).toBeDefined()
      expect(PowerModeColors.high).toBeDefined()
    })

    it('should get power mode color', () => {
      expect(getPowerModeColor('sleep')).toBeDefined()
      expect(getPowerModeColor('high')).toBeDefined()
    })
  })

  describe('miner name', () => {
    it('should get miner name from type', () => {
      const name = getMinerName('miner-am-s19')
      expect(name).toBeTruthy()
      expect(typeof name).toBe('string')
    })
  })

  describe('isMinerOffline advanced cases', () => {
    it('should detect offline by status', () => {
      const device = {
        last: {
          snap: {
            stats: { status: 'offline' },
            config: { mode: 'normal' },
          },
        },
      }
      expect(isMinerOffline(device)).toBe(true)
    })

    it('should detect offline by empty stats and config', () => {
      const device = {
        last: {
          snap: {
            stats: {},
            config: {},
          },
        },
      }
      expect(isMinerOffline(device)).toBe(true)
    })

    it('should not be offline with stats and config present', () => {
      const device = {
        last: {
          snap: {
            stats: { status: 'mining', power: 100 },
            config: { mode: 'normal' },
          },
        },
      }
      expect(isMinerOffline(device)).toBe(false)
    })

    describe('removeContainerPrefix', () => {
      it('should remove container prefix', () => {
        expect(removeContainerPrefix('container-test')).toEqual('test')
      })
    })

    describe('getContainerSpecificStats', () => {
      it('returns container_specific stats when present', () => {
        const data = {
          last: {
            snap: {
              stats: {
                container_specific: {
                  cooling_system: { enabled: true },
                  tank_pressure: 2.5,
                },
              },
            },
          },
        } as unknown as Device

        const result = getContainerSpecificStats(data)

        expect(result).toEqual({
          cooling_system: { enabled: true },
          tank_pressure: 2.5,
        })
      })

      it('returns empty object when container_specific is missing', () => {
        const data = {
          last: {
            snap: {
              stats: {
                other_field: 'value',
              },
            },
          },
        } as unknown as Device

        const result = getContainerSpecificStats(data)

        expect(result).toEqual({})
      })

      it('returns empty object when stats is missing', () => {
        const data = {
          last: {
            snap: {},
          },
        } as unknown as Device

        const result = getContainerSpecificStats(data)

        expect(result).toEqual({})
      })

      it('returns empty object when snap is missing', () => {
        const data = {
          last: {},
        } as unknown as Device

        const result = getContainerSpecificStats(data)

        expect(result).toEqual({})
      })

      it('returns empty object when last is missing', () => {
        const data = {} as unknown as Device

        const result = getContainerSpecificStats(data)

        expect(result).toEqual({})
      })

      it('returns empty object when data is undefined', () => {
        const result = getContainerSpecificStats(undefined as unknown as Device)

        expect(result).toEqual({})
      })

      it('returns empty object when data is null', () => {
        const result = getContainerSpecificStats(null as unknown as Device)

        expect(result).toEqual({})
      })

      it('handles nested container_specific data', () => {
        const data = {
          last: {
            snap: {
              stats: {
                container_specific: {
                  dry_cooler: [
                    { index: 0, enabled: true },
                    { index: 1, enabled: false },
                  ],
                  oil_pump: [{ index: 0, enabled: true }],
                },
              },
            },
          },
        } as unknown as Device

        const result = getContainerSpecificStats(data)

        expect(result).toEqual({
          dry_cooler: [
            { index: 0, enabled: true },
            { index: 1, enabled: false },
          ],
          oil_pump: [{ index: 0, enabled: true }],
        })
      })

      it('handles container_specific with null value', () => {
        const data = {
          last: {
            snap: {
              stats: {
                container_specific: null,
              },
            },
          },
        } as unknown as Device

        const result = getContainerSpecificStats(data)

        expect(result).toEqual({})
      })

      it('handles container_specific with undefined value', () => {
        const data = {
          last: {
            snap: {
              stats: {
                container_specific: undefined,
              },
            },
          },
        } as unknown as Device

        const result = getContainerSpecificStats(data)

        expect(result).toEqual({})
      })

      it('preserves all properties in container_specific', () => {
        const data = {
          last: {
            snap: {
              stats: {
                container_specific: {
                  field1: 'value1',
                  field2: 123,
                  field3: true,
                  field4: null,
                  field5: { nested: 'object' },
                },
              },
            },
          },
        } as unknown as Device

        const result = getContainerSpecificStats(data)

        expect(result).toEqual({
          field1: 'value1',
          field2: 123,
          field3: true,
          field4: null,
          field5: { nested: 'object' },
        })
      })
    })
  })

  describe('getDeviceData', () => {
    describe('null/undefined handling', () => {
      it('should return error when device is null', () => {
        const [error, data] = getDeviceData(null)

        expect(error).toBe('Device Not Found')
        expect(data).toBeUndefined()
      })

      it('should return error when device is undefined', () => {
        const [error, data] = getDeviceData(undefined)

        expect(error).toBe('Device Not Found')
        expect(data).toBeUndefined()
      })
    })

    describe('missing last data', () => {
      it('should return device with empty snap when last is missing', () => {
        const device: Device = {
          id: 'device-1',
          type: 'container',
          tags: ['tag1'],
          rack: 'rack-1',
          username: 'user1',
          containerId: 'container-1',
        }

        const [error, data] = getDeviceData(device)

        expect(error).toBeUndefined()
        expect(data).toBeDefined()
        expect(data?.snap).toEqual({ stats: {}, config: {} })
        expect(data?.err).toBe('Last Device info not found')
        expect(data?.id).toBe('device-1')
      })
    })

    describe('valid device data', () => {
      it('should return device data with snap when last exists', () => {
        const device: Device = {
          id: 'device-1',
          type: 'container',
          tags: ['tag1'],
          rack: 'rack-1',
          username: 'user1',
          containerId: 'container-1',
          last: {
            snap: {
              stats: { temperature: 25 },
              config: { mode: 'auto' },
            },
            alerts: [],
          },
        } as unknown as Device

        const [error, data] = getDeviceData(device)

        expect(error).toBeUndefined()
        expect(data).toBeDefined()
      })

      it('should return error when last contains error', () => {
        const device: Device = {
          id: 'device-1',
          type: 'container',
          last: {
            err: 'Connection timeout',
            snap: {
              stats: {},
              config: {},
            },
          },
        } as unknown as Device

        const [error, data] = getDeviceData(device)

        expect(error).toBe('Connection timeout')
        expect(data).toBeDefined()
        expect(data?.err).toBe('Connection timeout')
      })

      it('should use default snap when snap is null', () => {
        const device: Device = {
          id: 'device-1',
          last: {
            snap: null,
          },
        } as unknown as Device

        const [error, data] = getDeviceData(device)

        expect(error).toBeUndefined()
        expect(data?.snap).toEqual({ stats: {}, config: {} })
      })

      it('should preserve all device properties', () => {
        const device: Device = {
          id: 'device-1',
          type: 'container',
          tags: ['tag1', 'tag2'],
          rack: 'rack-1',
          username: 'user1',
          info: { location: 'datacenter-1' },
          containerId: 'container-1',
          address: '192.168.1.1',
          last: {
            snap: {
              stats: { power: 100 },
              config: {},
            },
            alerts: [{ type: 'warning' }],
          },
        } as unknown as Device

        const [error, data] = getDeviceData(device)

        expect(error).toBeUndefined()
        expect(data?.id).toBe('device-1')
        expect(data?.type).toBe('container')
        expect(data?.tags).toEqual(['tag1', 'tag2'])
        expect(data?.rack).toBe('rack-1')
        expect(data?.username).toBe('user1')
        expect(data?.info).toEqual({ location: 'datacenter-1' })
        expect(data?.containerId).toBe('container-1')
        expect(data?.address).toBe('192.168.1.1')
        expect(data?.alerts).toEqual([{ type: 'warning' }])
      })
    })
  })

  describe('getTableDeviceData', () => {
    describe('when device has no last data', () => {
      const device: Device = {
        id: 'device-1',
        type: 'miner',
        rack: 'rack-001',
        tags: ['Production'],
        address: '192.168.1.1',
      }

      it('returns undefined error', () => {
        expect(getTableDeviceData(device).error).toBeUndefined()
      })

      it('returns id', () => {
        expect(getTableDeviceData(device).id).toBe('device-1')
      })

      it('returns type', () => {
        expect(getTableDeviceData(device).type).toBe('miner')
      })

      it('returns empty stats from default snap', () => {
        expect(getTableDeviceData(device).stats).toEqual({})
      })

      it('returns empty config from default snap', () => {
        expect(getTableDeviceData(device).config).toEqual({})
      })

      it('returns err as "Last Device info not found"', () => {
        expect(getTableDeviceData(device).err).toBe('Last Device info not found')
      })
    })

    describe('when device has valid last data', () => {
      const device = {
        id: 'device-1',
        type: 'miner',
        rack: 'rack-001',
        tags: ['Production'],
        address: '192.168.1.1',
        info: { serialNum: 'SN-001', macAddress: 'aa:bb:cc:dd:ee:ff' },
        last: {
          err: null,
          alerts: [],
          snap: {
            stats: { hashrate: 100 },
            config: { power_mode: 'normal' },
          },
        },
      } as unknown as Device

      it('returns null error', () => {
        expect(getTableDeviceData(device).error).toBeNull()
      })

      it('returns id', () => {
        expect(getTableDeviceData(device).id).toBe('device-1')
      })

      it('returns type', () => {
        expect(getTableDeviceData(device).type).toBe('miner')
      })

      it('returns rack', () => {
        expect(getTableDeviceData(device).rack).toBe('rack-001')
      })

      it('returns address', () => {
        expect(getTableDeviceData(device).address).toBe('192.168.1.1')
      })

      it('returns info', () => {
        expect(getTableDeviceData(device).info).toEqual({
          serialNum: 'SN-001',
          macAddress: 'aa:bb:cc:dd:ee:ff',
        })
      })

      it('returns null err', () => {
        expect(getTableDeviceData(device).err).toBeNull()
      })

      it('returns tags', () => {
        expect(getTableDeviceData(device).tags).toEqual(['Production'])
      })

      it('returns alerts', () => {
        expect(getTableDeviceData(device).alerts).toEqual([])
      })

      it('returns stats from snap', () => {
        expect(getTableDeviceData(device).stats).toEqual({ hashrate: 100 })
      })

      it('returns config from snap', () => {
        expect(getTableDeviceData(device).config).toEqual({ power_mode: 'normal' })
      })

      it('forwards last.err as error', () => {
        const deviceWithErr = {
          ...device,
          last: { ...device.last, err: 'Connection timeout' },
        } as unknown as Device
        expect(getTableDeviceData(deviceWithErr).error).toBe('Connection timeout')
      })
    })
  })

  describe('appendContainerToTag', () => {
    it('should append container to tag', () => {
      const tag = 'tag1'
      const result = appendContainerToTag(tag)

      expect(result).toBe('container-tag1')
    })
  })

  describe('getIsMinerPowerReadingAvailable', () => {
    it('returns undefined when model is undefined', () => {
      expect(getIsMinerPowerReadingAvailable(undefined)).toBeUndefined()
    })

    it('returns whatsminer availability', () => {
      const result = getIsMinerPowerReadingAvailable('wm')
      expect(result).toBe(true)
    })

    it('returns antminer availability from map (true case)', () => {
      const result = getIsMinerPowerReadingAvailable('miner-am-s21')
      expect(result).toBe(true)
    })

    it('returns antminer availability from map (false case)', () => {
      const result = getIsMinerPowerReadingAvailable('miner-am-s19xp')
      expect(result).toBe(false)
    })

    it('returns undefined for antminer model not in map', () => {
      const result = getIsMinerPowerReadingAvailable('antminer-unknown')
      expect(result).toBeUndefined()
    })

    it('returns avalon availability', () => {
      const result = getIsMinerPowerReadingAvailable('av')
      expect(result).toBe(true)
    })

    it('is case insensitive', () => {
      const result = getIsMinerPowerReadingAvailable('WM')
      expect(result).toBe(true)
    })

    it('returns undefined for unknown model type', () => {
      const result = getIsMinerPowerReadingAvailable('random-device')
      expect(result).toBeUndefined()
    })
  })

  describe('isMiner', () => {
    it('returns true for miner type', () => {
      expect(isMiner('miner-s19')).toBe(true)
    })

    it('returns false for non-miner type', () => {
      expect(isMiner('container-s19')).toBe(false)
    })

    it('returns false for undefined', () => {
      expect(isMiner(undefined)).toBe(false)
    })

    it('is case sensitive (does not match uppercase)', () => {
      expect(isMiner('MINER-s19')).toBe(false)
    })
  })

  describe('isContainer', () => {
    it('returns true for container type', () => {
      expect(isContainer('container-s19')).toBe(true)
    })

    it('returns false for non-container type', () => {
      expect(isContainer('miner-s19')).toBe(false)
    })

    it('returns false for undefined', () => {
      expect(isContainer(undefined)).toBe(false)
    })

    it('is case sensitive (does not match uppercase)', () => {
      expect(isContainer('CONTAINER-s19')).toBe(false)
    })
  })

  describe('getRackNameFromId', () => {
    it('extracts the first three dash-separated segments', () => {
      expect(getRackNameFromId('site-row-rack-slot-1')).toBe('site-row-rack')
    })

    it('returns the full string when it has exactly three segments', () => {
      expect(getRackNameFromId('site-row-rack')).toBe('site-row-rack')
    })

    it('returns empty string when fewer than three segments', () => {
      expect(getRackNameFromId('site-row')).toBe('')
    })

    it('returns empty string for a single segment', () => {
      expect(getRackNameFromId('site')).toBe('')
    })

    it('returns empty string for an empty string', () => {
      expect(getRackNameFromId('')).toBe('')
    })

    it('handles segments with numbers', () => {
      expect(getRackNameFromId('dc1-row2-rack3-slot4')).toBe('dc1-row2-rack3')
    })

    it('handles long ids with many segments', () => {
      expect(getRackNameFromId('a-b-c-d-e-f')).toBe('a-b-c')
    })

    it('handles ids where segments contain underscores', () => {
      expect(getRackNameFromId('site_1-row_2-rack_3-extra')).toBe('site_1-row_2-rack_3')
    })
  })

  describe('appendIdToTag', () => {
    it('prepends "id-" to a device id', () => {
      expect(appendIdToTag('abc123')).toBe('id-abc123')
    })

    it('handles numeric string ids', () => {
      expect(appendIdToTag('42')).toBe('id-42')
    })

    it('handles ids that already contain dashes', () => {
      expect(appendIdToTag('site-row-rack')).toBe('id-site-row-rack')
    })

    it('handles empty string', () => {
      expect(appendIdToTag('')).toBe('id-')
    })

    it('handles ids with special characters', () => {
      expect(appendIdToTag('device:001')).toBe('id-device:001')
    })
  })

  describe('appendIdToTags', () => {
    it('prepends "id-" to each device id in the list', () => {
      expect(appendIdToTags(['a', 'b', 'c'])).toEqual(['id-a', 'id-b', 'id-c'])
    })

    it('returns empty array for empty input', () => {
      expect(appendIdToTags([])).toEqual([])
    })

    it('handles a single-element list', () => {
      expect(appendIdToTags(['only'])).toEqual(['id-only'])
    })

    it('preserves order of elements', () => {
      const ids = ['z', 'a', 'm']
      expect(appendIdToTags(ids)).toEqual(['id-z', 'id-a', 'id-m'])
    })

    it('does not mutate the input array', () => {
      const ids = ['x', 'y']
      const copy = [...ids]
      appendIdToTags(ids)
      expect(ids).toEqual(copy)
    })

    it('each result is consistent with appendIdToTag applied individually', () => {
      const ids = ['foo', 'bar', 'baz']
      const result = appendIdToTags(ids)
      ids.forEach((id, i) => {
        expect(result[i]).toBe(appendIdToTag(id))
      })
    })
  })

  describe('getSupportedPowerModes', () => {
    describe('undefined / unrecognised model', () => {
      it('returns empty array when model is undefined', () => {
        expect(getSupportedPowerModes(undefined)).toEqual([])
      })

      it('returns empty array when model is an empty string', () => {
        expect(getSupportedPowerModes('')).toEqual([])
      })

      it('returns empty array for an unrecognised model', () => {
        expect(getSupportedPowerModes('unknown-device-x')).toEqual([])
      })
    })

    describe('Whatsminer', () => {
      it('returns SLEEP, LOW, NORMAL, HIGH for an exact whatsminer model', () => {
        expect(getSupportedPowerModes(MINER_TYPE.WHATSMINER)).toEqual([
          MINER_POWER_MODE.SLEEP,
          MINER_POWER_MODE.LOW,
          MINER_POWER_MODE.NORMAL,
          MINER_POWER_MODE.HIGH,
        ])
      })

      it('matches case-insensitively', () => {
        const model = MINER_TYPE.WHATSMINER.toUpperCase()
        expect(getSupportedPowerModes(model)).toEqual([
          MINER_POWER_MODE.SLEEP,
          MINER_POWER_MODE.LOW,
          MINER_POWER_MODE.NORMAL,
          MINER_POWER_MODE.HIGH,
        ])
      })

      it('matches when model is a longer type string containing whatsminer', () => {
        expect(getSupportedPowerModes(`container-${MINER_TYPE.WHATSMINER}-m56`)).toEqual([
          MINER_POWER_MODE.SLEEP,
          MINER_POWER_MODE.LOW,
          MINER_POWER_MODE.NORMAL,
          MINER_POWER_MODE.HIGH,
        ])
      })

      it('includes LOW mode (unlike antminer)', () => {
        const modes = getSupportedPowerModes(MINER_TYPE.WHATSMINER)
        expect(modes).toContain(MINER_POWER_MODE.LOW)
      })
    })

    describe('Antminer', () => {
      it('returns SLEEP and NORMAL for an exact antminer model', () => {
        expect(getSupportedPowerModes(MINER_TYPE.ANTMINER)).toEqual([
          MINER_POWER_MODE.SLEEP,
          MINER_POWER_MODE.NORMAL,
        ])
      })

      it('matches case-insensitively', () => {
        const model = MINER_TYPE.ANTMINER.toUpperCase()
        expect(getSupportedPowerModes(model)).toEqual([
          MINER_POWER_MODE.SLEEP,
          MINER_POWER_MODE.NORMAL,
        ])
      })

      it('matches when model is a longer type string containing antminer', () => {
        expect(getSupportedPowerModes(`${MINER_TYPE.ANTMINER}-s19-pro`)).toEqual([
          MINER_POWER_MODE.SLEEP,
          MINER_POWER_MODE.NORMAL,
        ])
      })

      it('does not include LOW or HIGH modes', () => {
        const modes = getSupportedPowerModes(MINER_TYPE.ANTMINER)
        expect(modes).not.toContain(MINER_POWER_MODE.LOW)
        expect(modes).not.toContain(MINER_POWER_MODE.HIGH)
      })
    })

    describe('Avalon', () => {
      it('returns SLEEP, NORMAL, HIGH for an exact avalon model', () => {
        expect(getSupportedPowerModes(MINER_TYPE.AVALON)).toEqual([
          MINER_POWER_MODE.SLEEP,
          MINER_POWER_MODE.NORMAL,
          MINER_POWER_MODE.HIGH,
        ])
      })

      it('matches case-insensitively', () => {
        const model = MINER_TYPE.AVALON.toUpperCase()
        expect(getSupportedPowerModes(model)).toEqual([
          MINER_POWER_MODE.SLEEP,
          MINER_POWER_MODE.NORMAL,
          MINER_POWER_MODE.HIGH,
        ])
      })

      it('matches when model is a longer type string containing avalon', () => {
        expect(getSupportedPowerModes(`${MINER_TYPE.AVALON}-a1346`)).toEqual([
          MINER_POWER_MODE.SLEEP,
          MINER_POWER_MODE.NORMAL,
          MINER_POWER_MODE.HIGH,
        ])
      })

      it('does not include LOW mode', () => {
        const modes = getSupportedPowerModes(MINER_TYPE.AVALON)
        expect(modes).not.toContain(MINER_POWER_MODE.LOW)
      })

      it('includes HIGH mode (unlike antminer)', () => {
        const modes = getSupportedPowerModes(MINER_TYPE.AVALON)
        expect(modes).toContain(MINER_POWER_MODE.HIGH)
      })
    })

    describe('SLEEP mode present for all recognised types', () => {
      it.each([MINER_TYPE.WHATSMINER, MINER_TYPE.ANTMINER, MINER_TYPE.AVALON])(
        'includes SLEEP for %s',
        (model) => {
          expect(getSupportedPowerModes(model)).toContain(MINER_POWER_MODE.SLEEP)
        },
      )
    })

    describe('return value order', () => {
      it('Whatsminer modes are in the order SLEEP, LOW, NORMAL, HIGH', () => {
        const modes = getSupportedPowerModes(MINER_TYPE.WHATSMINER)
        expect(modes.indexOf(MINER_POWER_MODE.SLEEP)).toBeLessThan(
          modes.indexOf(MINER_POWER_MODE.LOW),
        )
        expect(modes.indexOf(MINER_POWER_MODE.LOW)).toBeLessThan(
          modes.indexOf(MINER_POWER_MODE.NORMAL),
        )
        expect(modes.indexOf(MINER_POWER_MODE.NORMAL)).toBeLessThan(
          modes.indexOf(MINER_POWER_MODE.HIGH),
        )
      })

      it('Antminer modes are in the order SLEEP, NORMAL', () => {
        const modes = getSupportedPowerModes(MINER_TYPE.ANTMINER)
        expect(modes.indexOf(MINER_POWER_MODE.SLEEP)).toBeLessThan(
          modes.indexOf(MINER_POWER_MODE.NORMAL),
        )
      })

      it('Avalon modes are in the order SLEEP, NORMAL, HIGH', () => {
        const modes = getSupportedPowerModes(MINER_TYPE.AVALON)
        expect(modes.indexOf(MINER_POWER_MODE.SLEEP)).toBeLessThan(
          modes.indexOf(MINER_POWER_MODE.NORMAL),
        )
        expect(modes.indexOf(MINER_POWER_MODE.NORMAL)).toBeLessThan(
          modes.indexOf(MINER_POWER_MODE.HIGH),
        )
      })
    })
  })

  describe('isAvalon', () => {
    it('returns true for avalon model', () => {
      expect(isAvalon('miner-av')).toBe(true)
      expect(isAvalon('miner-av-something')).toBe(true)
    })
  })
  describe('isWhatsminer', () => {
    it('returns true for whatsminer model', () => {
      expect(isWhatsminer('miner-wm')).toBe(true)
      expect(isWhatsminer('miner-wm-something')).toBe(true)
    })
  })
  describe('isAntminer', () => {
    it('returns true for antiminer model', () => {
      expect(isAntminer('miner-am')).toBe(true)
      expect(isAntminer('miner-am-something')).toBe(true)
    })
  })

  describe('getMinerShortCode', () => {
    it('should return the explicit code if it is provided', () => {
      const result = getMinerShortCode('M123', ['code-ignored'])
      expect(result).toBe('M123')
    })

    it('should extract the code from tags if explicit code is missing', () => {
      const tags = ['site-1', 'code-B45', 'pos-01_02']
      const result = getMinerShortCode(undefined, tags)
      expect(result).toBe('B45')
    })

    it('should ignore tags that end with "undefined"', () => {
      const tags = ['code-undefined', 'code-C78']
      const result = getMinerShortCode(undefined, tags)
      expect(result).toBe('C78')
    })

    it('should return the default value if no code or valid tag is found', () => {
      const tags = ['site-1', 'pos-01_02']
      const result = getMinerShortCode(undefined, tags)
      expect(result).toBe('N/A')
    })

    it('should return a custom default value if provided', () => {
      const result = getMinerShortCode(undefined, [], 'Unknown')
      expect(result).toBe('Unknown')
    })

    it('should handle undefined tags array gracefully', () => {
      const result = getMinerShortCode(undefined, undefined)
      expect(result).toBe('N/A')
    })

    it('should return the first valid code tag found if multiple exist', () => {
      const tags = ['code-FIRST', 'code-SECOND']
      const result = getMinerShortCode(undefined, tags)
      expect(result).toBe('FIRST')
    })
  })

  describe('getTemperatureColor', () => {
    const MIN = 20
    const MAX = 100

    describe('Boundary and Edge Cases', () => {
      it('returns UNKNOWN if any input is null', () => {
        // @ts-ignore: testing runtime null checks
        expect(getTemperatureColor(null, 100, 50)).toBe(HEATMAP.UNKNOWN)
        // @ts-ignore
        expect(getTemperatureColor(20, null, 50)).toBe(HEATMAP.UNKNOWN)
        // @ts-ignore
        expect(getTemperatureColor(20, 100, null)).toBe(HEATMAP.UNKNOWN)
      })

      it('returns HEATMAP.LOW if current is less than or equal to min', () => {
        expect(getTemperatureColor(MIN, MAX, 10)).toBe(HEATMAP.LOW)
        expect(getTemperatureColor(MIN, MAX, 20)).toBe(HEATMAP.LOW)
      })

      it('returns HEATMAP.HIGH if current is greater than or equal to max', () => {
        expect(getTemperatureColor(MIN, MAX, 110)).toBe(HEATMAP.HIGH)
        expect(getTemperatureColor(MIN, MAX, 100)).toBe(HEATMAP.HIGH)
      })
    })

    describe('Gradient Anchor Points', () => {
      it('returns HEATMAP.LOW_MEDIUM exactly at the 35% mark', () => {
        expect(getTemperatureColor(MIN, MAX, 48)).toBe(HEATMAP.LOW_MEDIUM)
      })

      it('returns HEATMAP.HIGH_MEDIUM exactly at the 70% mark', () => {
        expect(getTemperatureColor(MIN, MAX, 76)).toBe(HEATMAP.HIGH_MEDIUM)
      })
    })

    describe('Interpolation Logic', () => {
      it('interpolates correctly between LOW (0%) and LOW_MEDIUM (35%)', () => {
        const result = getTemperatureColor(MIN, MAX, 34)
        expect(result).toBe('#006981')
      })

      it('interpolates correctly between HIGH_MEDIUM (70%) and HIGH (100%)', () => {
        const result = getTemperatureColor(MIN, MAX, 88)
        expect(result).toBe('#eb973f')
      })
    })

    describe('Hex Formatting', () => {
      it('pads single-digit hex values with a leading zero', () => {
        const result = getTemperatureColor(0, 100, 1)
        expect(result?.length).toBe(7)
        expect(result).toMatch(/^#[0-9a-f]{6}$/)
      })
    })
  })
})
