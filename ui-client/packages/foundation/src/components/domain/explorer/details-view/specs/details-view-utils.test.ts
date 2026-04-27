import { describe, expect, it } from 'vitest'
import { ACTION_TYPES } from '../../../../../constants/actions'
import { getButtonsStates } from '../details-view-utils'

const baseParams = {
  selectedDevices: [],
  pendingSubmissions: [],
  selectedSockets: {},
}

describe('getButtonsStates', () => {
  describe('returns empty state', () => {
    it('returns empty object when no pending submissions', () => {
      const result = getButtonsStates(baseParams)
      expect(result).toEqual({})
    })

    it('returns empty object when pending submissions do not match selected devices', () => {
      const result = getButtonsStates({
        selectedDevices: [{ tags: ['miner-1'] }],
        pendingSubmissions: [{ action: ACTION_TYPES.REBOOT, tags: ['miner-2'] }],
        selectedSockets: {},
      })
      expect(result.isRebootButtonDisabled).toBe(false)
    })

    it('returns empty object when no selected devices and no sockets', () => {
      const result = getButtonsStates({
        selectedDevices: [],
        pendingSubmissions: [{ action: ACTION_TYPES.REBOOT, tags: ['miner-1'] }],
        selectedSockets: {},
      })
      expect(result).toEqual({
        isRebootButtonDisabled: false,
      })
    })
  })

  describe('tag matching', () => {
    it('matches when tags intersect', () => {
      const result = getButtonsStates({
        selectedDevices: [{ tags: ['miner-1', 'miner-2'] }],
        pendingSubmissions: [{ action: ACTION_TYPES.REBOOT, tags: ['miner-1'] }],
        selectedSockets: {},
      })
      expect(result.isRebootButtonDisabled).toBe(true)
    })

    it('does not match when tags do not intersect', () => {
      const result = getButtonsStates({
        selectedDevices: [{ tags: ['miner-3'] }],
        pendingSubmissions: [{ action: ACTION_TYPES.REBOOT, tags: ['miner-1'] }],
        selectedSockets: {},
      })
      expect(result.isRebootButtonDisabled).toBe(false)
    })

    it('handles devices with no tags', () => {
      const result = getButtonsStates({
        selectedDevices: [{}],
        pendingSubmissions: [{ action: ACTION_TYPES.REBOOT, tags: ['miner-1'] }],
        selectedSockets: {},
      })
      expect(result).toEqual({
        isRebootButtonDisabled: false,
      })
    })

    it('handles pending submission with no tags', () => {
      const result = getButtonsStates({
        selectedDevices: [{ tags: ['miner-1'] }],
        pendingSubmissions: [{ action: ACTION_TYPES.REBOOT }],
        selectedSockets: {},
      })
      expect(result.isRebootButtonDisabled).toBe(false)
    })

    it('deduplicates tags from multiple devices', () => {
      const result = getButtonsStates({
        selectedDevices: [{ tags: ['miner-1'] }, { tags: ['miner-1'] }],
        pendingSubmissions: [{ action: ACTION_TYPES.REBOOT, tags: ['miner-1'] }],
        selectedSockets: {},
      })
      expect(result.isRebootButtonDisabled).toBe(true)
    })

    it('collects tags from multiple devices', () => {
      const result = getButtonsStates({
        selectedDevices: [{ tags: ['miner-1'] }, { tags: ['miner-2'] }],
        pendingSubmissions: [{ action: ACTION_TYPES.REBOOT, tags: ['miner-2'] }],
        selectedSockets: {},
      })
      expect(result.isRebootButtonDisabled).toBe(true)
    })
  })

  describe('socket matching', () => {
    it('matches when socket IDs intersect', () => {
      const result = getButtonsStates({
        selectedDevices: [],
        pendingSubmissions: [
          {
            action: ACTION_TYPES.SWITCH_SOCKET,
            tags: ['container-container-1'],
            params: [[[0, 0, true]]],
          },
        ],
        selectedSockets: {
          'container-1': {
            sockets: [{ pduIndex: 0, socket: 0 }],
          },
        },
      })
      expect(result.isSwitchSocketButtonDisabled).toBe(true)
    })

    it('does not match when socket IDs do not intersect', () => {
      const result = getButtonsStates({
        selectedDevices: [],
        pendingSubmissions: [
          {
            action: ACTION_TYPES.SWITCH_SOCKET,
            tags: ['container-container-1'],
            params: [[[0, 1, true]]],
          },
        ],
        selectedSockets: {
          'container-1': {
            sockets: [{ pduIndex: 0, socket: 0 }],
          },
        },
      })
      expect(result.isSwitchSocketButtonDisabled).toBe(false)
    })

    it('handles multiple sockets in same container', () => {
      const result = getButtonsStates({
        selectedDevices: [],
        pendingSubmissions: [
          {
            action: ACTION_TYPES.SWITCH_SOCKET,
            tags: ['container-container-1'],
            params: [[[0, 2, true]]],
          },
        ],
        selectedSockets: {
          'container-1': {
            sockets: [
              { pduIndex: 0, socket: 0 },
              { pduIndex: 0, socket: 2 },
            ],
          },
        },
      })
      expect(result.isSwitchSocketButtonDisabled).toBe(true)
    })

    it('handles missing params for socket matching', () => {
      const result = getButtonsStates({
        selectedDevices: [],
        pendingSubmissions: [
          {
            action: ACTION_TYPES.SWITCH_SOCKET,
            tags: ['container-container-1'],
          },
        ],
        selectedSockets: {
          'container-1': {
            sockets: [{ pduIndex: 0, socket: 0 }],
          },
        },
      })
      expect(result.isSwitchSocketButtonDisabled).toBe(false)
    })

    it('handles params that are not arrays', () => {
      const result = getButtonsStates({
        selectedDevices: [],
        pendingSubmissions: [
          {
            action: ACTION_TYPES.SWITCH_SOCKET,
            tags: ['container-container-1'],
            params: ['not-an-array'],
          },
        ],
        selectedSockets: {
          'container-1': {
            sockets: [{ pduIndex: 0, socket: 0 }],
          },
        },
      })
      expect(result.isSwitchSocketButtonDisabled).toBe(false)
    })

    it('handles socket params with less than 2 elements', () => {
      const result = getButtonsStates({
        selectedDevices: [],
        pendingSubmissions: [
          {
            action: ACTION_TYPES.SWITCH_SOCKET,
            tags: ['container-container-1'],
            params: [[[0]]],
          },
        ],
        selectedSockets: {
          'container-1': {
            sockets: [{ pduIndex: 0, socket: 0 }],
          },
        },
      })
      expect(result.isSwitchSocketButtonDisabled).toBe(false)
    })

    it('strips container- prefix from container tag', () => {
      const result = getButtonsStates({
        selectedDevices: [],
        pendingSubmissions: [
          {
            action: ACTION_TYPES.SWITCH_SOCKET,
            tags: ['container-my-container'],
            params: [[[1, 2, true]]],
          },
        ],
        selectedSockets: {
          'my-container': {
            sockets: [{ pduIndex: 1, socket: 2 }],
          },
        },
      })
      expect(result.isSwitchSocketButtonDisabled).toBe(true)
    })
  })

  describe('SET_LED action', () => {
    it('disables LED on button when isOn is true and tags match', () => {
      const result = getButtonsStates({
        selectedDevices: [{ tags: ['miner-1'] }],
        pendingSubmissions: [{ action: ACTION_TYPES.SET_LED, tags: ['miner-1'], params: [true] }],
        selectedSockets: {},
      })
      expect(result.isSetLedOnButtonDisabled).toBe(true)
      expect(result.isSetLedOffButtonDisabled).toBe(false)
    })

    it('disables LED off button when isOn is false and tags match', () => {
      const result = getButtonsStates({
        selectedDevices: [{ tags: ['miner-1'] }],
        pendingSubmissions: [{ action: ACTION_TYPES.SET_LED, tags: ['miner-1'], params: [false] }],
        selectedSockets: {},
      })
      expect(result.isSetLedOnButtonDisabled).toBe(false)
      expect(result.isSetLedOffButtonDisabled).toBe(true)
    })

    it('does not disable LED buttons when tags do not match', () => {
      const result = getButtonsStates({
        selectedDevices: [{ tags: ['miner-1'] }],
        pendingSubmissions: [{ action: ACTION_TYPES.SET_LED, tags: ['miner-2'], params: [true] }],
        selectedSockets: {},
      })
      expect(result.isSetLedOnButtonDisabled).toBe(false)
      expect(result.isSetLedOffButtonDisabled).toBe(false)
    })

    it('treats undefined params as false for LED', () => {
      const result = getButtonsStates({
        selectedDevices: [{ tags: ['miner-1'] }],
        pendingSubmissions: [{ action: ACTION_TYPES.SET_LED, tags: ['miner-1'], params: [] }],
        selectedSockets: {},
      })
      expect(result.isSetLedOnButtonDisabled).toBe(false)
      expect(result.isSetLedOffButtonDisabled).toBe(true)
    })
  })

  describe('REBOOT action', () => {
    it('disables reboot button when tags match', () => {
      const result = getButtonsStates({
        selectedDevices: [{ tags: ['miner-1'] }],
        pendingSubmissions: [{ action: ACTION_TYPES.REBOOT, tags: ['miner-1'] }],
        selectedSockets: {},
      })
      expect(result.isRebootButtonDisabled).toBe(true)
    })

    it('does not disable reboot button when tags do not match', () => {
      const result = getButtonsStates({
        selectedDevices: [{ tags: ['miner-1'] }],
        pendingSubmissions: [{ action: ACTION_TYPES.REBOOT, tags: ['miner-2'] }],
        selectedSockets: {},
      })
      expect(result.isRebootButtonDisabled).toBe(false)
    })
  })

  describe('SETUP_POOLS action', () => {
    it('disables setup pools button when tags match', () => {
      const result = getButtonsStates({
        selectedDevices: [{ tags: ['miner-1'] }],
        pendingSubmissions: [{ action: ACTION_TYPES.SETUP_POOLS, tags: ['miner-1'] }],
        selectedSockets: {},
      })
      expect(result.isSetupPoolsButtonDisabled).toBe(true)
    })
  })

  describe('SET_POWER_MODE action', () => {
    it('disables set power mode button when tags match', () => {
      const result = getButtonsStates({
        selectedDevices: [{ tags: ['miner-1'] }],
        pendingSubmissions: [{ action: ACTION_TYPES.SET_POWER_MODE, tags: ['miner-1'] }],
        selectedSockets: {},
      })
      expect(result.isSetPowerModeButtonDisabled).toBe(true)
    })
  })

  describe('SETUP_FREQUENCY_SPEED action', () => {
    it('disables setup frequency button when tags match', () => {
      const result = getButtonsStates({
        selectedDevices: [{ tags: ['miner-1'] }],
        pendingSubmissions: [{ action: ACTION_TYPES.SETUP_FREQUENCY_SPEED, tags: ['miner-1'] }],
        selectedSockets: {},
      })
      expect(result.isSetUpFrequencyButtonDisabled).toBe(true)
    })
  })

  describe('SWITCH_COOLING_SYSTEM action', () => {
    it('disables switch cooling system button when tags match', () => {
      const result = getButtonsStates({
        selectedDevices: [{ tags: ['miner-1'] }],
        pendingSubmissions: [{ action: ACTION_TYPES.SWITCH_COOLING_SYSTEM, tags: ['miner-1'] }],
        selectedSockets: {},
      })
      expect(result.isSwitchCoolingSystemButtonDisabled).toBe(true)
    })
  })

  describe('RESET_ALARM action', () => {
    it('disables reset alarm button when tags match', () => {
      const result = getButtonsStates({
        selectedDevices: [{ tags: ['miner-1'] }],
        pendingSubmissions: [{ action: ACTION_TYPES.RESET_ALARM, tags: ['miner-1'] }],
        selectedSockets: {},
      })
      expect(result.isResetAlarmButtonDisabled).toBe(true)
    })
  })

  describe('SWITCH_CONTAINER action', () => {
    it('disables switch container button when tags match', () => {
      const result = getButtonsStates({
        selectedDevices: [{ tags: ['miner-1'] }],
        pendingSubmissions: [{ action: ACTION_TYPES.SWITCH_CONTAINER, tags: ['miner-1'] }],
        selectedSockets: {},
      })
      expect(result.isSwitchContainerButtonDisabled).toBe(true)
    })
  })

  describe('RESET_CONTAINER action', () => {
    it('disables reset container button when tags match', () => {
      const result = getButtonsStates({
        selectedDevices: [{ tags: ['miner-1'] }],
        pendingSubmissions: [{ action: ACTION_TYPES.RESET_CONTAINER, tags: ['miner-1'] }],
        selectedSockets: {},
      })
      expect(result.isResetContainerButtonDisabled).toBe(true)
    })
  })

  describe('EMERGENCY_STOP action', () => {
    it('disables emergency stop button when tags match', () => {
      const result = getButtonsStates({
        selectedDevices: [{ tags: ['miner-1'] }],
        pendingSubmissions: [{ action: ACTION_TYPES.EMERGENCY_STOP, tags: ['miner-1'] }],
        selectedSockets: {},
      })
      expect(result.isEmergencyStopButtonDisabled).toBe(true)
    })
  })

  describe('MAINTENANCE action', () => {
    it('disables maintenance button when tags match', () => {
      const result = getButtonsStates({
        selectedDevices: [{ tags: ['miner-1'] }],
        pendingSubmissions: [{ action: ACTION_TYPES.MAINTENANCE, tags: ['miner-1'] }],
        selectedSockets: {},
      })
      expect(result.isMaintenanceButtonDisabled).toBe(true)
    })
  })

  describe('SET_TANK_ENABLED action', () => {
    it('disables tank 1 button when tankId is 1 and tags match', () => {
      const result = getButtonsStates({
        selectedDevices: [{ tags: ['miner-1'] }],
        pendingSubmissions: [
          { action: ACTION_TYPES.SET_TANK_ENABLED, tags: ['miner-1'], params: [1] },
        ],
        selectedSockets: {},
      })
      expect(result.isSetTank1EnabledButtonDisabled).toBe(true)
    })

    it('disables tank 2 button when tankId is 2 and tags match', () => {
      const result = getButtonsStates({
        selectedDevices: [{ tags: ['miner-1'] }],
        pendingSubmissions: [
          { action: ACTION_TYPES.SET_TANK_ENABLED, tags: ['miner-1'], params: [2] },
        ],
        selectedSockets: {},
      })
      expect(result.isSetTank2EnabledButtonDisabled).toBe(true)
    })

    it('creates dynamic key for tank button', () => {
      const result = getButtonsStates({
        selectedDevices: [{ tags: ['miner-1'] }],
        pendingSubmissions: [
          { action: ACTION_TYPES.SET_TANK_ENABLED, tags: ['miner-1'], params: [3] },
        ],
        selectedSockets: {},
      })
      expect(result.isSetTank3EnabledButtonDisabled).toBe(true)
    })
  })

  describe('SET_AIR_EXHAUST_ENABLED action', () => {
    it('disables air exhaust button when tags match', () => {
      const result = getButtonsStates({
        selectedDevices: [{ tags: ['miner-1'] }],
        pendingSubmissions: [{ action: ACTION_TYPES.SET_AIR_EXHAUST_ENABLED, tags: ['miner-1'] }],
        selectedSockets: {},
      })
      expect(result.isSetAirExhaustEnabledButtonDisabled).toBe(true)
    })
  })

  describe('SWITCH_SOCKET action', () => {
    it('disables switch socket button when tags match', () => {
      const result = getButtonsStates({
        selectedDevices: [{ tags: ['miner-1'] }],
        pendingSubmissions: [{ action: ACTION_TYPES.SWITCH_SOCKET, tags: ['miner-1'] }],
        selectedSockets: {},
      })
      expect(result.isSwitchSocketButtonDisabled).toBe(true)
    })
  })

  describe('default case', () => {
    it('returns unchanged state for unknown action', () => {
      const result = getButtonsStates({
        selectedDevices: [{ tags: ['miner-1'] }],
        pendingSubmissions: [{ action: 'UNKNOWN_ACTION', tags: ['miner-1'] }],
        selectedSockets: {},
      })
      expect(result).toEqual({})
    })
  })

  describe('multiple pending submissions', () => {
    it('accumulates states from multiple pending submissions', () => {
      const result = getButtonsStates({
        selectedDevices: [{ tags: ['miner-1'] }],
        pendingSubmissions: [
          { action: ACTION_TYPES.REBOOT, tags: ['miner-1'] },
          { action: ACTION_TYPES.SETUP_POOLS, tags: ['miner-1'] },
          { action: ACTION_TYPES.SET_POWER_MODE, tags: ['miner-1'] },
        ],
        selectedSockets: {},
      })
      expect(result.isRebootButtonDisabled).toBe(true)
      expect(result.isSetupPoolsButtonDisabled).toBe(true)
      expect(result.isSetPowerModeButtonDisabled).toBe(true)
    })

    it('handles mix of matching and non-matching submissions', () => {
      const result = getButtonsStates({
        selectedDevices: [{ tags: ['miner-1'] }],
        pendingSubmissions: [
          { action: ACTION_TYPES.REBOOT, tags: ['miner-1'] },
          { action: ACTION_TYPES.SETUP_POOLS, tags: ['miner-2'] },
        ],
        selectedSockets: {},
      })
      expect(result.isRebootButtonDisabled).toBe(true)
      expect(result.isSetupPoolsButtonDisabled).toBe(false)
    })

    it('handles multiple LED actions', () => {
      const result = getButtonsStates({
        selectedDevices: [{ tags: ['miner-1'] }],
        pendingSubmissions: [
          { action: ACTION_TYPES.SET_LED, tags: ['miner-1'], params: [true] },
          { action: ACTION_TYPES.SET_LED, tags: ['miner-1'], params: [false] },
        ],
        selectedSockets: {},
      })
      expect(result.isSetLedOnButtonDisabled).toBe(false)
      expect(result.isSetLedOffButtonDisabled).toBe(true)
    })
  })

  describe('combined tag and socket matching', () => {
    it('matches when only socket IDs intersect', () => {
      const result = getButtonsStates({
        selectedDevices: [{ tags: ['miner-unrelated'] }],
        pendingSubmissions: [
          {
            action: ACTION_TYPES.SWITCH_SOCKET,
            tags: ['container-container-1'],
            params: [[[0, 0, true]]],
          },
        ],
        selectedSockets: {
          'container-1': {
            sockets: [{ pduIndex: 0, socket: 0 }],
          },
        },
      })
      expect(result.isSwitchSocketButtonDisabled).toBe(true)
    })

    it('matches when only tags intersect', () => {
      const result = getButtonsStates({
        selectedDevices: [{ tags: ['miner-1'] }],
        pendingSubmissions: [
          {
            action: ACTION_TYPES.REBOOT,
            tags: ['miner-1'],
            params: [[[0, 0, true]]],
          },
        ],
        selectedSockets: {
          'container-2': {
            sockets: [{ pduIndex: 1, socket: 1 }],
          },
        },
      })
      expect(result.isRebootButtonDisabled).toBe(true)
    })
  })
})
