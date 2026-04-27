import { describe, expect, it, vi } from 'vitest'
import { CONTAINER_SETTINGS_MODEL } from '../../constants/container-constants'
import type { Device } from '../../types/device'
import {
  getAntspaceContainerControlsBoxData,
  getBitdeerContainerControlsBoxData,
  getContainerName,
  getContainerSettingsModel,
  getDeviceContainerPosText,
  getMinerTypeFromContainerType,
  getNumberSelected,
  isAntminerContainer,
  isAntspaceHydro,
  isAntspaceImmersion,
  isAvalonContainer,
  isBitdeer,
  isBitmainImmersion,
  isContainerControlNotSupported,
  isContainerOffline,
  isMicroBT,
  isMicroBTKehua,
  isWhatsminerContainer,
} from '../container-utils'
import { getContainerSpecificStats, getCoolingSystem } from '../device-utils'

const GET_CONTAINER_NAME_TEST_ARGS = {
  bitdeer: { type: 'container-bd-d40-m56', container: 'bitdeer-5a' },
  bitmainImmersion: { type: 'container-as-immersion', container: 'antspace-immersion-2' },
  bitmainHydro: { type: 'container-as-hk3', container: 'bitmain-hydro-1' },
  microBT: { type: 'container-mbt-kehua', container: 'microbt-1' },
}

vi.mock('../device-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../device-utils')>()
  return {
    ...actual,
    getContainerSpecificStats: vi.fn(),
    getCoolingSystem: vi.fn(),
  }
})

const makeDevice = (overrides: Partial<Device> = {}): Device =>
  ({
    id: 'device-001',
    ...overrides,
  }) as Device

describe('container utils', () => {
  describe('getContainerName', () => {
    it('should get the proper container name', () => {
      expect(
        getContainerName(
          GET_CONTAINER_NAME_TEST_ARGS.bitdeer.container,
          GET_CONTAINER_NAME_TEST_ARGS.bitdeer.type,
        ),
      ).toBe('Bitdeer 5a M56')

      expect(
        getContainerName(
          GET_CONTAINER_NAME_TEST_ARGS.bitmainImmersion.container,
          GET_CONTAINER_NAME_TEST_ARGS.bitmainImmersion.type,
        ),
      ).toBe('Antspace Immersion 2')

      expect(
        getContainerName(
          GET_CONTAINER_NAME_TEST_ARGS.bitmainHydro.container,
          GET_CONTAINER_NAME_TEST_ARGS.bitmainHydro.type,
        ),
      ).toBe('Bitmain Hydro 1')

      expect(
        getContainerName(
          GET_CONTAINER_NAME_TEST_ARGS.microBT.container,
          GET_CONTAINER_NAME_TEST_ARGS.microBT.type,
        ),
      ).toBe('MicroBT 1 Kehua')
    })
  })

  describe('isContainerOffline', () => {
    it('should detect offline status properly', () => {
      expect(
        isContainerOffline({
          stats: {
            status: 'offline',
          },
        }),
      ).toBe(true)

      expect(
        isContainerOffline({
          stats: {
            status: 'other',
          },
        }),
      ).toBe(false)

      expect(
        isContainerOffline({
          stats: {},
        }),
      ).toBe(false)

      expect(isContainerOffline({})).toBe(false)
      // eslint-disable-next-line ts/ban-ts-comment
      // @ts-ignore
      expect(isContainerOffline()).toBe(false)
    })
  })

  describe('isBitdeer', () => {
    it('should detect Bitdeer containers', () => {
      expect(isBitdeer('bitdeer-5a')).toBe(true)
      expect(isBitdeer('bd-something')).toBe(true)
      expect(isBitdeer('BITDEER-1')).toBe(true)
      expect(isBitdeer('antspace-1')).toBe(false)
      expect(isBitdeer('microbt-1')).toBe(false)
      expect(isBitdeer(undefined)).toBe(false)
    })
  })

  describe('isAntspaceHydro', () => {
    it('should detect Antspace Hydro containers', () => {
      expect(isAntspaceHydro('antspace-hydro-1')).toBe(true)
      expect(isAntspaceHydro('as-hk3')).toBe(true)
      expect(isAntspaceHydro('bitmain-hydro-1')).toBe(true)
      expect(isAntspaceHydro('bitdeer-1')).toBe(false)
      expect(isAntspaceHydro('microbt-1')).toBe(false)
    })
  })

  describe('isMicroBT', () => {
    it('should detect MicroBT containers', () => {
      expect(isMicroBT('microbt-1')).toBe(true)
      expect(isMicroBT('mbt-something')).toBe(true)
      expect(isMicroBT('MICROBT-1')).toBe(true)
      expect(isMicroBT('bitdeer-1')).toBe(false)
      expect(isMicroBT('antspace-1')).toBe(false)
      expect(isMicroBT(undefined)).toBe(false)
    })
  })

  describe('isMicroBTKehua', () => {
    it('should detect MicroBT Kehua containers', () => {
      expect(isMicroBTKehua('container-mbt-kehua')).toBe(true)
      expect(isMicroBTKehua('container-mbt-kehua-1')).toBe(true)
      expect(isMicroBTKehua('microbt-wonderint')).toBe(false)
      expect(isMicroBTKehua('bitdeer-1')).toBe(false)
    })
  })

  describe('isAntspaceImmersion', () => {
    it('should detect Antspace Immersion containers', () => {
      expect(isAntspaceImmersion('antspace-immersion-1')).toBe(true)
      expect(isAntspaceImmersion('as-immersion')).toBe(true)
      expect(isAntspaceImmersion('bitmain-immersion')).toBe(true)
      expect(isAntspaceImmersion('bitmain-imm')).toBe(true)
      expect(isAntspaceImmersion('bitdeer-1')).toBe(false)
    })
  })

  describe('isBitmainImmersion', () => {
    it('should detect Bitmain Immersion containers', () => {
      expect(isBitmainImmersion('bitmain-immersion')).toBe(true)
      expect(isBitmainImmersion('bitmain-imm')).toBe(true)
      expect(isBitmainImmersion('container-as-immersion')).toBe(true)
      expect(isBitmainImmersion('bitdeer-1')).toBe(false)
      expect(isBitmainImmersion('microbt-1')).toBe(false)
    })
  })

  describe('getContainerName edge cases', () => {
    it('should handle maintenance container', () => {
      expect(getContainerName('maintenance')).toBe('Maintenance')
    })

    it('should handle empty container', () => {
      expect(getContainerName('')).toBe('')
      expect(getContainerName(undefined)).toBe('')
    })

    it('should handle container without type', () => {
      expect(getContainerName('bitdeer-1')).toBe('Bitdeer 1')
      expect(getContainerName('microbt-1')).toBe('Microbt 1')
    })

    it('should handle MicroBT Wonderint', () => {
      expect(getContainerName('microbt-1', 'container-mbt-wonderint')).toBe('MicroBT 1 Wonder')
    })

    it('should handle MicroBT without matching type', () => {
      expect(getContainerName('microbt-1', 'container-mbt-unknown')).toBe('MicroBT 1')
    })

    it('should handle generic three-part names', () => {
      expect(getContainerName('some-test-1')).toBe('Some Test 1')
    })

    it('should handle Bitdeer with type variations', () => {
      expect(getContainerName('bitdeer-1a', 'container-bd-d40-m30')).toContain('Bitdeer')
      expect(getContainerName('bitdeer-1a', 'container-bd-d40-m30')).toContain('M30')
      expect(getContainerName('bitdeer-2b', 'container-bd-d40-s19xp')).toContain('S19XP')
    })

    it('should handle MicroBT Kehua with full type', () => {
      const result = getContainerName('microbt-2', 'container-mbt-kehua')
      expect(result).toContain('MicroBT')
      expect(result).toContain('2')
      expect(result).toContain('Kehua')
    })

    it('should handle case sensitivity in container detection', () => {
      expect(getContainerName('BITDEER-1')).toContain('Bitdeer')
      expect(getContainerName('MICROBT-1')).toContain('Microbt')
    })

    it('should return empty string for null-ish values', () => {
      expect(getContainerName(null as any)).toBe('')
      expect(getContainerName('' as any)).toBe('')
    })
  })

  describe('type detection edge cases', () => {
    it('should handle mixed case in type detection', () => {
      expect(isBitdeer('BITDEER-1')).toBe(true)
      expect(isBitdeer('BiTdEeR-1')).toBe(true)
      expect(isMicroBT('MICROBT-1')).toBe(true)
      expect(isMicroBT('MiCrObT-1')).toBe(true)
    })

    it('should handle container type patterns', () => {
      expect(isBitdeer('container-bd-d40-m30')).toBe(true)
      expect(isMicroBT('container-mbt-kehua')).toBe(true)
      expect(isAntspaceHydro('container-as-hk3')).toBe(true)
    })

    it('should handle different container variations', () => {
      expect(isBitdeer('bd-1')).toBe(true)
      expect(isMicroBT('mbt-1')).toBe(true)
      expect(isAntspaceHydro('as-hk3')).toBe(true)
    })
  })

  describe('getContainerSettingsModel', () => {
    it('returns null for empty type', () => {
      expect(getContainerSettingsModel('')).toBeNull()
    })

    it('returns bitdeer model', () => {
      expect(getContainerSettingsModel('container-bd-d40')).toBe(CONTAINER_SETTINGS_MODEL.BITDEER)
    })

    it('returns microbt model', () => {
      expect(getContainerSettingsModel('container-mbt-100')).toBe(CONTAINER_SETTINGS_MODEL.MICROBT)
    })

    it('returns hydro model', () => {
      expect(getContainerSettingsModel('container-as-hk3')).toBe(CONTAINER_SETTINGS_MODEL.HYDRO)
    })

    it('returns immersion model for bitmain', () => {
      expect(getContainerSettingsModel('container-bitmain-immersion')).toBe(
        CONTAINER_SETTINGS_MODEL.IMMERSION,
      )
    })

    it('returns immersion model for antspace', () => {
      expect(getContainerSettingsModel('container-as-immersion')).toBe(
        CONTAINER_SETTINGS_MODEL.IMMERSION,
      )
    })

    it('returns null for unknown type', () => {
      expect(getContainerSettingsModel('unknown-type')).toBeNull()
    })
  })
  describe('isAvalonContainer', () => {
    it('returns false when isContainer is false', () => {
      expect(isAvalonContainer('containerttt-a1346')).toBe(false)
    })

    it('returns true when isContainer is true and type includes A1346 token', () => {
      expect(isAvalonContainer('container-a1346')).toBe(true)
    })

    it('returns false when isContainer is true but type does not include A1346 token', () => {
      expect(isAvalonContainer('container-m56')).toBe(false)
    })

    it('returns false when type is undefined', () => {
      expect(isAvalonContainer(undefined)).toBe(false)
    })
  })

  describe('isWhatsminerContainer', () => {
    it('returns false when isContainer is false', () => {
      expect(isWhatsminerContainer('containerrrr-m56')).toBe(false)
    })

    it('returns true when type includes M56 token', () => {
      expect(isWhatsminerContainer('container-m56')).toBe(true)
    })

    it('returns true when type includes M30 token', () => {
      expect(isWhatsminerContainer('container-m30')).toBe(true)
    })

    it('returns true when isMicroBT returns true', () => {
      expect(isWhatsminerContainer('container-microbt')).toBe(true)
    })

    it('returns false when no whatsminer condition matches', () => {
      expect(isWhatsminerContainer('container-s19xp')).toBe(false)
    })

    it('returns false when type is undefined', () => {
      expect(isWhatsminerContainer(undefined)).toBe(false)
    })
  })

  describe('isAntminerContainer', () => {
    it('returns false when isContainer is false', () => {
      expect(isAntminerContainer('containerrr-s19xp')).toBe(false)
    })

    it('returns true when type includes S19XP token', () => {
      expect(isAntminerContainer('container-s19xp')).toBe(true)
    })

    it('returns true when isAntspaceImmersion returns true', () => {
      expect(isAntminerContainer('container-as-immersion')).toBe(true)
    })

    it('returns true when isAntspaceHydro returns true', () => {
      expect(isAntminerContainer('container-as-hk3')).toBe(true)
    })

    it('returns false when no antminer condition matches', () => {
      expect(isAntminerContainer('container-m56')).toBe(false)
    })

    it('returns false when type is undefined', () => {
      expect(isAntminerContainer(undefined)).toBe(false)
    })
  })

  describe('getMinerTypeFromContainerType', () => {
    it('returns AVALON when isAvalonContainer matches', () => {
      expect(getMinerTypeFromContainerType('container-a1346')).toBe('av')
    })

    it('returns WHATSMINER when isWhatsminerContainer matches via M56', () => {
      expect(getMinerTypeFromContainerType('container-m56')).toBe('wm')
    })

    it('returns WHATSMINER when isWhatsminerContainer matches via M30', () => {
      expect(getMinerTypeFromContainerType('container-m30')).toBe('wm')
    })

    it('returns WHATSMINER when isMicroBT returns true', () => {
      expect(getMinerTypeFromContainerType('container-microbt')).toBe('wm')
    })

    it('returns ANTMINER when isAntminerContainer matches via S19XP', () => {
      expect(getMinerTypeFromContainerType('container-s19xp')).toBe('am')
    })

    it('returns ANTMINER when isAntspaceImmersion returns true', () => {
      expect(getMinerTypeFromContainerType('container-as-immersion')).toBe('am')
    })

    it('returns ANTMINER when isAntspaceHydro returns true', () => {
      expect(getMinerTypeFromContainerType('container-as-hk3')).toBe('am')
    })

    it('returns undefined when no type matches', () => {
      expect(getMinerTypeFromContainerType('container-unknown')).toBeUndefined()
    })

    it('returns undefined when isContainer is false for all checks', () => {
      expect(getMinerTypeFromContainerType('containerrr-a1346')).toBeUndefined()
    })

    it('AVALON takes priority over WHATSMINER when type matches both', () => {
      // type contains both a1346 and m56 tokens
      expect(getMinerTypeFromContainerType('container-a1346-m56')).toBe('av')
    })

    it('WHATSMINER takes priority over ANTMINER when type matches both', () => {
      expect(getMinerTypeFromContainerType('container-m56-s19xp')).toBe('wm')
    })
  })

  describe('getDeviceContainerPosText', () => {
    it('should return only the container name if pdu and socket are missing', () => {
      const info = {
        containerInfo: { container: GET_CONTAINER_NAME_TEST_ARGS.bitdeer.container },
      }
      const result = getDeviceContainerPosText(info)
      expect(result).toBe('Bitdeer 5a')
    })

    it('should return container name and built destination string from pdu and socket', () => {
      const info = {
        containerInfo: { container: GET_CONTAINER_NAME_TEST_ARGS.bitdeer.container },
        pdu: 'P1',
        socket: '05',
      }
      const result = getDeviceContainerPosText(info)
      expect(result).toBe('Bitdeer 5a P1_05')
    })

    it('should prioritize the "pos" property over pdu and socket', () => {
      const info = {
        containerInfo: { container: GET_CONTAINER_NAME_TEST_ARGS.bitdeer.container },
        pdu: 'P1',
        socket: '05',
        pos: 'OVERRIDE_POS',
      }
      const result = getDeviceContainerPosText(info)
      expect(result).toBe('Bitdeer 5a OVERRIDE_POS')
    })

    it('should handle numeric pdu and socket values correctly', () => {
      const info = {
        containerInfo: { container: GET_CONTAINER_NAME_TEST_ARGS.bitdeer.container },
        pdu: 10,
        socket: 2,
      }
      const result = getDeviceContainerPosText(info)
      expect(result).toBe('Bitdeer 5a 10_2')
    })

    it('should return the mocked "Unknown Container" text if container is missing', () => {
      const info = {
        pdu: 'P1',
        socket: 'S1',
      }
      const result = getDeviceContainerPosText(info)
      expect(result).toBe(' P1_S1')
    })

    it('should handle an empty object or null input gracefully', () => {
      // @ts-expect-error - testing runtime resilience
      const result = getDeviceContainerPosText(null)
      expect(result).toBe('')
    })
  })
  describe('getNumberSelected', () => {
    it('returns zeros for an empty selection', () => {
      const result = getNumberSelected({})
      expect(result).toEqual({ nContainers: 0, nSockets: 0 })
    })

    it('correctly calculates containers and nested sockets', () => {
      const selected = {
        'container-1': {
          sockets: { s1: {}, s2: {} },
        },
        'container-2': {
          sockets: { s3: {} },
        },
        'container-3': {
          // No sockets property
        },
      }

      const result = getNumberSelected(selected)
      expect(result).toEqual({ nContainers: 3, nSockets: 3 })
    })

    it('handles containers with null sockets gracefully', () => {
      const selected = {
        'container-1': { sockets: null },
      }
      const result = getNumberSelected(selected)
      expect(result.nSockets).toBe(0)
    })
  })

  describe('isContainerControlNotSupported', () => {
    it('returns true for Antspace Hydro containers', () => {
      expect(isContainerControlNotSupported('container-as-hk3')).toBe(true)
    })

    it('returns true for Antspace Immersion containers', () => {
      expect(isContainerControlNotSupported('container-as-immersion')).toBe(true)
    })

    it('returns false for non-Antspace containers', () => {
      expect(isContainerControlNotSupported('container-m56')).toBe(false)
      expect(isContainerControlNotSupported('container-s19xp')).toBe(false)
    })

    it('returns false for undefined type', () => {
      // @ts-expect-error - testing runtime resilience
      expect(isContainerControlNotSupported(undefined)).toBe(false)
    })
  })

  describe('getAntspaceContainerControlsBoxData', () => {
    describe('id', () => {
      it('returns correct id from device', () => {
        getContainerSpecificStats.mockReturnValue({})
        const result = getAntspaceContainerControlsBoxData(makeDevice({ id: 'device-001' }))
        expect(result.id).toBe('device-001')
      })

      it('returns undefined id when device has no id', () => {
        getContainerSpecificStats.mockReturnValue({})
        const result = getAntspaceContainerControlsBoxData(makeDevice({ id: undefined }))
        expect(result.id).toBeUndefined()
      })

      it('uses empty device as default when no argument passed', () => {
        getContainerSpecificStats.mockReturnValue({})
        const result = getAntspaceContainerControlsBoxData()
        expect(result).toBeDefined()
      })
    })

    describe('pidModeEnabled', () => {
      it('returns pid_mode when it is true', () => {
        getContainerSpecificStats.mockReturnValue({ pid_mode: true })
        const result = getAntspaceContainerControlsBoxData(makeDevice())
        expect(result.pidModeEnabled).toBe(true)
      })

      it('returns pid_mode when it is false', () => {
        getContainerSpecificStats.mockReturnValue({ pid_mode: false })
        const result = getAntspaceContainerControlsBoxData(makeDevice())
        expect(result.pidModeEnabled).toBe(false)
      })

      it('returns undefined when pid_mode is not present', () => {
        getContainerSpecificStats.mockReturnValue({})
        const result = getAntspaceContainerControlsBoxData(makeDevice())
        expect(result.pidModeEnabled).toBeUndefined()
      })

      it('returns undefined when getContainerSpecificStats returns undefined', () => {
        getContainerSpecificStats.mockReturnValue(undefined)
        const result = getAntspaceContainerControlsBoxData(makeDevice())
        expect(result.pidModeEnabled).toBeUndefined()
      })

      it('returns undefined when getContainerSpecificStats returns null', () => {
        getContainerSpecificStats.mockReturnValue(null)
        const result = getAntspaceContainerControlsBoxData(makeDevice())
        expect(result.pidModeEnabled).toBeUndefined()
      })
    })

    describe('runningModeEnabled', () => {
      it('returns running_mode when it is true', () => {
        getContainerSpecificStats.mockReturnValue({ running_mode: true })
        const result = getAntspaceContainerControlsBoxData(makeDevice())
        expect(result.runningModeEnabled).toBe(true)
      })

      it('returns running_mode when it is false', () => {
        getContainerSpecificStats.mockReturnValue({ running_mode: false })
        const result = getAntspaceContainerControlsBoxData(makeDevice())
        expect(result.runningModeEnabled).toBe(false)
      })

      it('returns undefined when running_mode is not present', () => {
        getContainerSpecificStats.mockReturnValue({})
        const result = getAntspaceContainerControlsBoxData(makeDevice())
        expect(result.runningModeEnabled).toBeUndefined()
      })

      it('returns undefined when getContainerSpecificStats returns undefined', () => {
        getContainerSpecificStats.mockReturnValue(undefined)
        const result = getAntspaceContainerControlsBoxData(makeDevice())
        expect(result.runningModeEnabled).toBeUndefined()
      })
    })

    describe('combined state', () => {
      it('returns correct combined state when both modes are true', () => {
        getContainerSpecificStats.mockReturnValue({ pid_mode: true, running_mode: true })
        const result = getAntspaceContainerControlsBoxData(makeDevice({ id: 'device-001' }))
        expect(result).toEqual({
          id: 'device-001',
          pidModeEnabled: true,
          runningModeEnabled: true,
        })
      })

      it('returns correct combined state when both modes are false', () => {
        getContainerSpecificStats.mockReturnValue({ pid_mode: false, running_mode: false })
        const result = getAntspaceContainerControlsBoxData(makeDevice({ id: 'device-001' }))
        expect(result).toEqual({
          id: 'device-001',
          pidModeEnabled: false,
          runningModeEnabled: false,
        })
      })

      it('returns correct combined state when stats are empty', () => {
        getContainerSpecificStats.mockReturnValue({})
        const result = getAntspaceContainerControlsBoxData(makeDevice({ id: 'device-001' }))
        expect(result).toEqual({
          id: 'device-001',
          pidModeEnabled: undefined,
          runningModeEnabled: undefined,
        })
      })

      it('calls getContainerSpecificStats with the device', () => {
        getContainerSpecificStats.mockReturnValue({})
        const device = makeDevice()
        getAntspaceContainerControlsBoxData(device)
        expect(getContainerSpecificStats).toHaveBeenCalledWith(device)
      })

      it('calls getContainerSpecificStats twice (once per field)', () => {
        getContainerSpecificStats.mockReturnValue({})
        getAntspaceContainerControlsBoxData(makeDevice())
        expect(getContainerSpecificStats).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('getBitdeerContainerControlsBoxData', () => {
    describe('id', () => {
      it('returns correct id from device', () => {
        getCoolingSystem.mockReturnValue({ exhaust_fan_enabled: true, oil_pump: [] })
        const result = getBitdeerContainerControlsBoxData(makeDevice({ id: 'device-001' }))
        expect(result.id).toBe('device-001')
      })

      it('returns undefined id when device has no id', () => {
        getCoolingSystem.mockReturnValue({ exhaust_fan_enabled: false, oil_pump: [] })
        const result = getBitdeerContainerControlsBoxData(makeDevice({ id: undefined }))
        expect(result.id).toBeUndefined()
      })

      it('uses empty device as default when no argument passed', () => {
        getCoolingSystem.mockReturnValue({})
        const result = getBitdeerContainerControlsBoxData()
        expect(result).toBeDefined()
      })
    })

    describe('exhaustFanEnabled', () => {
      it('returns exhaust_fan_enabled when true', () => {
        getCoolingSystem.mockReturnValue({ exhaust_fan_enabled: true, oil_pump: [] })
        const result = getBitdeerContainerControlsBoxData(makeDevice())
        expect(result.exhaustFanEnabled).toBe(true)
      })

      it('returns exhaust_fan_enabled when false', () => {
        getCoolingSystem.mockReturnValue({ exhaust_fan_enabled: false, oil_pump: [] })
        const result = getBitdeerContainerControlsBoxData(makeDevice())
        expect(result.exhaustFanEnabled).toBe(false)
      })

      it('returns undefined when exhaust_fan_enabled is not present', () => {
        getCoolingSystem.mockReturnValue({ oil_pump: [] })
        const result = getBitdeerContainerControlsBoxData(makeDevice())
        expect(result.exhaustFanEnabled).toBeUndefined()
      })
    })

    describe('tank1Enabled', () => {
      it('returns tank value from first oil_pump entry', () => {
        getCoolingSystem.mockReturnValue({
          oil_pump: [{ tank: true }, { tank: false }],
        })
        const result = getBitdeerContainerControlsBoxData(makeDevice())
        expect(result.tank1Enabled).toBe(true)
      })

      it('returns false when first oil_pump tank is false', () => {
        getCoolingSystem.mockReturnValue({
          oil_pump: [{ tank: false }],
        })
        const result = getBitdeerContainerControlsBoxData(makeDevice())
        expect(result.tank1Enabled).toBe(false)
      })

      it('returns undefined when oil_pump is empty array', () => {
        getCoolingSystem.mockReturnValue({ oil_pump: [] })
        const result = getBitdeerContainerControlsBoxData(makeDevice())
        expect(result.tank1Enabled).toBeUndefined()
      })

      it('returns undefined when oil_pump is not an array', () => {
        getCoolingSystem.mockReturnValue({ oil_pump: null })
        const result = getBitdeerContainerControlsBoxData(makeDevice())
        expect(result.tank1Enabled).toBeUndefined()
      })

      it('returns undefined when oil_pump is undefined', () => {
        getCoolingSystem.mockReturnValue({ oil_pump: undefined })
        const result = getBitdeerContainerControlsBoxData(makeDevice())
        expect(result.tank1Enabled).toBeUndefined()
      })

      it('returns undefined when first pump has no tank property', () => {
        getCoolingSystem.mockReturnValue({ oil_pump: [{}] })
        const result = getBitdeerContainerControlsBoxData(makeDevice())
        expect(result.tank1Enabled).toBeUndefined()
      })
    })

    describe('tank2Enabled', () => {
      it('returns tank value from second oil_pump entry', () => {
        getCoolingSystem.mockReturnValue({
          oil_pump: [{ tank: true }, { tank: false }],
        })
        const result = getBitdeerContainerControlsBoxData(makeDevice())
        expect(result.tank2Enabled).toBe(false)
      })

      it('returns true when second oil_pump tank is true', () => {
        getCoolingSystem.mockReturnValue({
          oil_pump: [{ tank: false }, { tank: true }],
        })
        const result = getBitdeerContainerControlsBoxData(makeDevice())
        expect(result.tank2Enabled).toBe(true)
      })

      it('returns undefined when oil_pump has only one entry', () => {
        getCoolingSystem.mockReturnValue({ oil_pump: [{ tank: true }] })
        const result = getBitdeerContainerControlsBoxData(makeDevice())
        expect(result.tank2Enabled).toBeUndefined()
      })

      it('returns undefined when oil_pump is empty array', () => {
        getCoolingSystem.mockReturnValue({ oil_pump: [] })
        const result = getBitdeerContainerControlsBoxData(makeDevice())
        expect(result.tank2Enabled).toBeUndefined()
      })

      it('returns undefined when oil_pump is not an array', () => {
        getCoolingSystem.mockReturnValue({ oil_pump: 'invalid' })
        const result = getBitdeerContainerControlsBoxData(makeDevice())
        expect(result.tank2Enabled).toBeUndefined()
      })

      it('returns undefined when second pump has no tank property', () => {
        getCoolingSystem.mockReturnValue({ oil_pump: [{}, {}] })
        const result = getBitdeerContainerControlsBoxData(makeDevice())
        expect(result.tank2Enabled).toBeUndefined()
      })
    })

    describe('combined state', () => {
      it('returns full correct state with two pumps', () => {
        getCoolingSystem.mockReturnValue({
          exhaust_fan_enabled: true,
          oil_pump: [{ tank: true }, { tank: false }],
        })
        const result = getBitdeerContainerControlsBoxData(makeDevice({ id: 'device-001' }))
        expect(result).toEqual({
          id: 'device-001',
          exhaustFanEnabled: true,
          tank1Enabled: true,
          tank2Enabled: false,
        })
      })

      it('returns correct state with empty oil_pump', () => {
        getCoolingSystem.mockReturnValue({
          exhaust_fan_enabled: false,
          oil_pump: [],
        })
        const result = getBitdeerContainerControlsBoxData(makeDevice({ id: 'device-001' }))
        expect(result).toEqual({
          id: 'device-001',
          exhaustFanEnabled: false,
          tank1Enabled: undefined,
          tank2Enabled: undefined,
        })
      })

      it('returns correct state when getCoolingSystem returns empty object', () => {
        getCoolingSystem.mockReturnValue({})
        const result = getBitdeerContainerControlsBoxData(makeDevice({ id: 'device-001' }))
        expect(result).toEqual({
          id: 'device-001',
          exhaustFanEnabled: undefined,
          tank1Enabled: undefined,
          tank2Enabled: undefined,
        })
      })

      it('calls getCoolingSystem with the device', () => {
        getCoolingSystem.mockReturnValue({ oil_pump: [] })
        const device = makeDevice()
        getBitdeerContainerControlsBoxData(device)
        expect(getCoolingSystem).toHaveBeenCalledWith(device)
      })

      it('calls getCoolingSystem once', () => {
        getCoolingSystem.mockReturnValue({ oil_pump: [] })
        getBitdeerContainerControlsBoxData(makeDevice())
        expect(getCoolingSystem).toHaveBeenCalledTimes(1)
      })
    })
  })
})
