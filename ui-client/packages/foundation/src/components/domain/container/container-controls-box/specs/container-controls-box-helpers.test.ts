import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Device } from '../../../../../types'
import { getSwitchAllSocketsParams } from '../../../../../utils/action-utils'
import { appendContainerToTag } from '../../../../../utils/device-utils'
import { notifyInfo } from '../../../../../utils/notification-utils'
import { getAllSelectedContainerInfo } from '../../helper'
import type { ContainerControlActionParams } from '../container-controls-box-helpers'
import {
  getContainerPowerModeActionTags,
  resetAlarm,
  setAirExhaustEnabled,
  setPowerMode,
  setTankEnabled,
  switchAllSockets,
  switchContainer,
  switchCoolingSystem,
} from '../container-controls-box-helpers'

vi.mock('../../../../../constants/actions', () => ({
  ACTION_TYPES: {
    SWITCH_CONTAINER: 'SWITCH_CONTAINER',
    SWITCH_COOLING_SYSTEM: 'SWITCH_COOLING_SYSTEM',
    SET_TANK_ENABLED: 'SET_TANK_ENABLED',
    SET_AIR_EXHAUST_ENABLED: 'SET_AIR_EXHAUST_ENABLED',
    RESET_ALARM: 'RESET_ALARM',
    SET_POWER_MODE: 'SET_POWER_MODE',
    SWITCH_SOCKET: 'SWITCH_SOCKET',
  },
  SUBMIT_ACTION_TYPES: {
    VOTING: 'voting',
  },
}))

vi.mock('../../../../../constants/devices', () => ({
  CROSS_THING_TYPES: {
    MINER: 'miner',
    CONTAINER: 'container',
  },
}))

vi.mock('../../../../../utils/action-utils', () => ({
  getSwitchAllSocketsParams: vi.fn((isOn: boolean) => [isOn ? 'all-on' : 'all-off']),
}))

vi.mock('../../../../../utils/device-utils', () => ({
  appendContainerToTag: vi.fn((container: string) => `container:${container}`),
  getOnOffText: vi.fn((isOn: boolean) => (isOn ? 'On' : 'Off')),
}))

vi.mock('../../../../../utils/notification-utils', () => ({
  notifyInfo: vi.fn(),
}))

vi.mock('../../helper', () => ({
  getAllSelectedContainerInfo: vi.fn((devices, isTag) =>
    devices.map((d: Device) => (isTag ? `container:${d.info?.container}` : d.info?.container)),
  ),
  getContainerActionPayload: vi.fn((isBatch, selectedDevices, data) => ({
    idTags: isBatch
      ? selectedDevices.map((d: Device) => `id:${d.id}`)
      : data?.id
        ? [`id:${data.id}`]
        : [],
    containerInfo: isBatch
      ? selectedDevices.map((d: Device) => d.info?.container)
      : data?.info?.container
        ? [data.info.container]
        : [],
  })),
}))

const makeDevice = (overrides: Partial<Device> = {}): Device =>
  ({
    id: 'device-001',
    info: { container: 'container-1' },
    ...overrides,
  }) as Device

const makeBaseParams = (
  overrides: Partial<ContainerControlActionParams> = {},
): ContainerControlActionParams => ({
  isOn: true,
  isBatch: false,
  selectedDevices: [makeDevice()],
  pendingSubmissions: [],
  data: makeDevice(),
  onUpdateExistedActions: vi.fn(),
  onAddPendingSubmission: vi.fn(),
  onResetSelections: vi.fn(),
  ...overrides,
})

describe('container-controls-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('switchContainer', () => {
    describe('onUpdateExistedActions', () => {
      it('calls onUpdateExistedActions with SWITCH_CONTAINER action type', () => {
        const params = makeBaseParams()
        switchContainer({ ...params, shouldResetDevices: false })
        expect(params.onUpdateExistedActions).toHaveBeenCalledWith(
          expect.objectContaining({ actionType: 'SWITCH_CONTAINER' }),
        )
      })

      it('passes selectedDevices to onUpdateExistedActions', () => {
        const params = makeBaseParams()
        switchContainer({ ...params, shouldResetDevices: false })
        expect(params.onUpdateExistedActions).toHaveBeenCalledWith(
          expect.objectContaining({ selectedDevices: params.selectedDevices }),
        )
      })

      it('passes pendingSubmissions to onUpdateExistedActions', () => {
        const params = makeBaseParams()
        switchContainer({ ...params, shouldResetDevices: false })
        expect(params.onUpdateExistedActions).toHaveBeenCalledWith(
          expect.objectContaining({ pendingSubmissions: params.pendingSubmissions }),
        )
      })
    })

    describe('onAddPendingSubmission', () => {
      it('calls onAddPendingSubmission with voting type', () => {
        const params = makeBaseParams()
        switchContainer({ ...params, shouldResetDevices: false })
        expect(params.onAddPendingSubmission).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'voting' }),
        )
      })

      it('calls onAddPendingSubmission with SWITCH_CONTAINER action', () => {
        const params = makeBaseParams()
        switchContainer({ ...params, shouldResetDevices: false })
        expect(params.onAddPendingSubmission).toHaveBeenCalledWith(
          expect.objectContaining({ action: 'SWITCH_CONTAINER' }),
        )
      })

      it('calls onAddPendingSubmission with isOn=true param', () => {
        const params = makeBaseParams({ isOn: true })
        switchContainer({ ...params, shouldResetDevices: false })
        expect(params.onAddPendingSubmission).toHaveBeenCalledWith(
          expect.objectContaining({ params: [true] }),
        )
      })

      it('calls onAddPendingSubmission with isOn=false param', () => {
        const params = makeBaseParams({ isOn: false })
        switchContainer({ ...params, shouldResetDevices: false })
        expect(params.onAddPendingSubmission).toHaveBeenCalledWith(
          expect.objectContaining({ params: [false] }),
        )
      })
    })

    describe('onResetSelections', () => {
      it('calls onResetSelections when shouldResetDevices is true', () => {
        const params = makeBaseParams()
        switchContainer({ ...params, shouldResetDevices: true })
        expect(params.onResetSelections).toHaveBeenCalledOnce()
      })

      it('does not call onResetSelections when shouldResetDevices is false', () => {
        const params = makeBaseParams()
        switchContainer({ ...params, shouldResetDevices: false })
        expect(params.onResetSelections).not.toHaveBeenCalled()
      })

      it('does not call onResetSelections when shouldResetDevices is undefined', () => {
        const params = makeBaseParams()
        switchContainer({ ...params })
        expect(params.onResetSelections).not.toHaveBeenCalled()
      })
    })

    describe('notification', () => {
      it('notifies with Switch Container On message', () => {
        const params = makeBaseParams({ isOn: true })
        switchContainer({ ...params })
        expect(notifyInfo).toHaveBeenCalledWith('Action added', 'Switch Container On')
      })

      it('notifies with Switch Container Off message', () => {
        const params = makeBaseParams({ isOn: false })
        switchContainer({ ...params })
        expect(notifyInfo).toHaveBeenCalledWith('Action added', 'Switch Container Off')
      })
    })
  })

  describe('switchCoolingSystem', () => {
    describe('onUpdateExistedActions', () => {
      it('calls onUpdateExistedActions with SWITCH_COOLING_SYSTEM action type', () => {
        const params = makeBaseParams()
        switchCoolingSystem(params)
        expect(params.onUpdateExistedActions).toHaveBeenCalledWith(
          expect.objectContaining({ actionType: 'SWITCH_COOLING_SYSTEM' }),
        )
      })
    })

    describe('onAddPendingSubmission', () => {
      it('calls onAddPendingSubmission with SWITCH_COOLING_SYSTEM action', () => {
        const params = makeBaseParams()
        switchCoolingSystem(params)
        expect(params.onAddPendingSubmission).toHaveBeenCalledWith(
          expect.objectContaining({ action: 'SWITCH_COOLING_SYSTEM' }),
        )
      })

      it('includes crossThing with miner type', () => {
        const params = makeBaseParams()
        switchCoolingSystem(params)
        expect(params.onAddPendingSubmission).toHaveBeenCalledWith(
          expect.objectContaining({
            crossThing: expect.objectContaining({ type: 'miner' }),
          }),
        )
      })

      it('includes containers in crossThing params', () => {
        const params = makeBaseParams()
        switchCoolingSystem(params)
        expect(params.onAddPendingSubmission).toHaveBeenCalledWith(
          expect.objectContaining({
            crossThing: expect.objectContaining({
              params: expect.objectContaining({ containers: expect.anything() }),
            }),
          }),
        )
      })

      it('passes isOn=true as param', () => {
        const params = makeBaseParams({ isOn: true })
        switchCoolingSystem(params)
        expect(params.onAddPendingSubmission).toHaveBeenCalledWith(
          expect.objectContaining({ params: [true] }),
        )
      })

      it('passes isOn=false as param', () => {
        const params = makeBaseParams({ isOn: false })
        switchCoolingSystem(params)
        expect(params.onAddPendingSubmission).toHaveBeenCalledWith(
          expect.objectContaining({ params: [false] }),
        )
      })
    })

    describe('onResetSelections', () => {
      it('always calls onResetSelections', () => {
        const params = makeBaseParams()
        switchCoolingSystem(params)
        expect(params.onResetSelections).toHaveBeenCalledOnce()
      })
    })

    describe('notification', () => {
      it('notifies Switch Cooling System On', () => {
        switchCoolingSystem(makeBaseParams({ isOn: true }))
        expect(notifyInfo).toHaveBeenCalledWith('Action added', 'Switch Cooling System On')
      })

      it('notifies Switch Cooling System Off', () => {
        switchCoolingSystem(makeBaseParams({ isOn: false }))
        expect(notifyInfo).toHaveBeenCalledWith('Action added', 'Switch Cooling System Off')
      })
    })
  })

  describe('setTankEnabled', () => {
    describe('onUpdateExistedActions', () => {
      it('calls onUpdateExistedActions with SET_TANK_ENABLED action type', () => {
        const params = makeBaseParams()
        setTankEnabled({ ...params, tankNumber: 1 })
        expect(params.onUpdateExistedActions).toHaveBeenCalledWith(
          expect.objectContaining({ actionType: 'SET_TANK_ENABLED' }),
        )
      })
    })

    describe('onAddPendingSubmission', () => {
      it('calls onAddPendingSubmission with SET_TANK_ENABLED action', () => {
        const params = makeBaseParams()
        setTankEnabled({ ...params, tankNumber: 1 })
        expect(params.onAddPendingSubmission).toHaveBeenCalledWith(
          expect.objectContaining({ action: 'SET_TANK_ENABLED' }),
        )
      })

      it('includes tankNumber and isOn in params', () => {
        const params = makeBaseParams({ isOn: true })
        setTankEnabled({ ...params, tankNumber: 1 })
        expect(params.onAddPendingSubmission).toHaveBeenCalledWith(
          expect.objectContaining({ params: [1, true] }),
        )
      })

      it('includes tankNumber 2 and isOn false in params', () => {
        const params = makeBaseParams({ isOn: false })
        setTankEnabled({ ...params, tankNumber: 2 })
        expect(params.onAddPendingSubmission).toHaveBeenCalledWith(
          expect.objectContaining({ params: [2, false] }),
        )
      })
    })

    describe('onResetSelections', () => {
      it('always calls onResetSelections', () => {
        const params = makeBaseParams()
        setTankEnabled({ ...params, tankNumber: 1 })
        expect(params.onResetSelections).toHaveBeenCalledOnce()
      })
    })

    describe('notification', () => {
      it('notifies with tank 1 circulation On', () => {
        setTankEnabled({ ...makeBaseParams({ isOn: true }), tankNumber: 1 })
        expect(notifyInfo).toHaveBeenCalledWith('Action added', 'Set tank 1 circulation On')
      })

      it('notifies with tank 2 circulation Off', () => {
        setTankEnabled({ ...makeBaseParams({ isOn: false }), tankNumber: 2 })
        expect(notifyInfo).toHaveBeenCalledWith('Action added', 'Set tank 2 circulation Off')
      })
    })
  })

  describe('setAirExhaustEnabled', () => {
    describe('onUpdateExistedActions', () => {
      it('calls onUpdateExistedActions with SET_AIR_EXHAUST_ENABLED action type', () => {
        const params = makeBaseParams()
        setAirExhaustEnabled(params)
        expect(params.onUpdateExistedActions).toHaveBeenCalledWith(
          expect.objectContaining({ actionType: 'SET_AIR_EXHAUST_ENABLED' }),
        )
      })
    })

    describe('onAddPendingSubmission', () => {
      it('calls onAddPendingSubmission with SET_AIR_EXHAUST_ENABLED action', () => {
        const params = makeBaseParams()
        setAirExhaustEnabled(params)
        expect(params.onAddPendingSubmission).toHaveBeenCalledWith(
          expect.objectContaining({ action: 'SET_AIR_EXHAUST_ENABLED' }),
        )
      })

      it('passes isOn=true as param', () => {
        const params = makeBaseParams({ isOn: true })
        setAirExhaustEnabled(params)
        expect(params.onAddPendingSubmission).toHaveBeenCalledWith(
          expect.objectContaining({ params: [true] }),
        )
      })

      it('passes isOn=false as param', () => {
        const params = makeBaseParams({ isOn: false })
        setAirExhaustEnabled(params)
        expect(params.onAddPendingSubmission).toHaveBeenCalledWith(
          expect.objectContaining({ params: [false] }),
        )
      })
    })

    describe('onResetSelections', () => {
      it('always calls onResetSelections', () => {
        const params = makeBaseParams()
        setAirExhaustEnabled(params)
        expect(params.onResetSelections).toHaveBeenCalledOnce()
      })
    })

    describe('notification', () => {
      it('notifies Set air exhaust On', () => {
        setAirExhaustEnabled(makeBaseParams({ isOn: true }))
        expect(notifyInfo).toHaveBeenCalledWith('Action added', 'Set air exhaust On')
      })

      it('notifies Set air exhaust Off', () => {
        setAirExhaustEnabled(makeBaseParams({ isOn: false }))
        expect(notifyInfo).toHaveBeenCalledWith('Action added', 'Set air exhaust Off')
      })
    })
  })

  describe('resetAlarm', () => {
    const makeResetParams = (overrides = {}) => {
      const { isOn: _isOn, ...rest } = makeBaseParams()
      return { ...rest, ...overrides }
    }

    describe('onUpdateExistedActions', () => {
      it('calls onUpdateExistedActions with RESET_ALARM action type', () => {
        const params = makeResetParams()
        resetAlarm(params)
        expect(params.onUpdateExistedActions).toHaveBeenCalledWith(
          expect.objectContaining({ actionType: 'RESET_ALARM' }),
        )
      })
    })

    describe('onAddPendingSubmission', () => {
      it('calls onAddPendingSubmission with RESET_ALARM action', () => {
        const params = makeResetParams()
        resetAlarm(params)
        expect(params.onAddPendingSubmission).toHaveBeenCalledWith(
          expect.objectContaining({ action: 'RESET_ALARM' }),
        )
      })

      it('passes empty params array', () => {
        const params = makeResetParams()
        resetAlarm(params)
        expect(params.onAddPendingSubmission).toHaveBeenCalledWith(
          expect.objectContaining({ params: [] }),
        )
      })
    })

    describe('onResetSelections', () => {
      it('always calls onResetSelections', () => {
        const params = makeResetParams()
        resetAlarm(params)
        expect(params.onResetSelections).toHaveBeenCalledOnce()
      })
    })

    describe('notification', () => {
      it('notifies Reset Alarm', () => {
        resetAlarm(makeResetParams())
        expect(notifyInfo).toHaveBeenCalledWith('Action added', 'Reset Alarm')
      })
    })
  })

  describe('getContainerPowerModeActionTags', () => {
    it('returns tagged container info when isBatch is true', () => {
      const devices = [
        makeDevice({ info: { container: 'container-1' } }),
        makeDevice({ info: { container: 'container-2' } }),
      ]
      const result = getContainerPowerModeActionTags({
        isBatch: true,
        devices,
        data: makeDevice(),
      })
      expect(result).toEqual(['container:container-1', 'container:container-2'])
    })

    it('returns tagged container from data when isBatch is false', () => {
      const result = getContainerPowerModeActionTags({
        isBatch: false,
        devices: [],
        data: makeDevice({ info: { container: 'container-1' } }),
      })
      expect(result).toEqual(['container:container-1'])
    })

    it('returns empty array when isBatch is false and data has no container', () => {
      const result = getContainerPowerModeActionTags({
        isBatch: false,
        devices: [],
        data: makeDevice({ info: {} }),
      })
      expect(result).toEqual([])
    })

    it('returns empty array when isBatch is false and data info is undefined', () => {
      const result = getContainerPowerModeActionTags({
        isBatch: false,
        devices: [],
        data: makeDevice({ info: undefined }),
      })
      expect(result).toEqual([])
    })

    it('calls getAllSelectedContainerInfo with isTag=true when isBatch', () => {
      const devices = [makeDevice()]
      getContainerPowerModeActionTags({ isBatch: true, devices, data: makeDevice() })
      expect(getAllSelectedContainerInfo).toHaveBeenCalledWith(devices, true)
    })

    it('calls appendContainerToTag when isBatch is false', () => {
      getContainerPowerModeActionTags({
        isBatch: false,
        devices: [],
        data: makeDevice({ info: { container: 'container-1' } }),
      })
      expect(appendContainerToTag).toHaveBeenCalledWith('container-1')
    })
  })

  describe('setPowerMode', () => {
    const makeSetPowerModeParams = (overrides = {}) => {
      const { isOn: _isOn, ...rest } = makeBaseParams()
      return {
        ...rest,
        powerMode: 'eco',
        devices: [makeDevice()],
        shouldResetDevices: false,
        ...overrides,
      }
    }

    describe('onUpdateExistedActions', () => {
      it('calls onUpdateExistedActions with SET_POWER_MODE action type', () => {
        const params = makeSetPowerModeParams()
        setPowerMode(params)
        expect(params.onUpdateExistedActions).toHaveBeenCalledWith(
          expect.objectContaining({ actionType: 'SET_POWER_MODE' }),
        )
      })
    })

    describe('onAddPendingSubmission', () => {
      it('calls onAddPendingSubmission with SET_POWER_MODE action', () => {
        const params = makeSetPowerModeParams()
        setPowerMode(params)
        expect(params.onAddPendingSubmission).toHaveBeenCalledWith(
          expect.objectContaining({ action: 'SET_POWER_MODE' }),
        )
      })

      it('includes powerMode in params', () => {
        const params = makeSetPowerModeParams({ powerMode: 'turbo' })
        setPowerMode(params)
        expect(params.onAddPendingSubmission).toHaveBeenCalledWith(
          expect.objectContaining({ params: ['turbo'] }),
        )
      })

      it('includes isBulkContainerAction=true', () => {
        const params = makeSetPowerModeParams()
        setPowerMode(params)
        expect(params.onAddPendingSubmission).toHaveBeenCalledWith(
          expect.objectContaining({ isBulkContainerAction: true }),
        )
      })

      it('includes crossThing with container type', () => {
        const params = makeSetPowerModeParams()
        setPowerMode(params)
        expect(params.onAddPendingSubmission).toHaveBeenCalledWith(
          expect.objectContaining({
            crossThing: expect.objectContaining({ type: 'container' }),
          }),
        )
      })
    })

    describe('onResetSelections', () => {
      it('calls onResetSelections when shouldResetDevices is true', () => {
        const params = makeSetPowerModeParams({ shouldResetDevices: true })
        setPowerMode(params)
        expect(params.onResetSelections).toHaveBeenCalledOnce()
      })

      it('does not call onResetSelections when shouldResetDevices is false', () => {
        const params = makeSetPowerModeParams({ shouldResetDevices: false })
        setPowerMode(params)
        expect(params.onResetSelections).not.toHaveBeenCalled()
      })
    })

    describe('notification', () => {
      it('notifies Set Power Mode for all devices', () => {
        setPowerMode(makeSetPowerModeParams({ powerMode: 'eco' }))
        expect(notifyInfo).toHaveBeenCalledWith(
          'Action added',
          'Set Power Mode eco for all devices',
        )
      })
    })
  })

  describe('switchAllSockets', () => {
    describe('onUpdateExistedActions', () => {
      it('calls onUpdateExistedActions with SWITCH_SOCKET action type', () => {
        const params = makeBaseParams()
        switchAllSockets(params)
        expect(params.onUpdateExistedActions).toHaveBeenCalledWith(
          expect.objectContaining({ actionType: 'SWITCH_SOCKET' }),
        )
      })
    })

    describe('onAddPendingSubmission', () => {
      it('calls onAddPendingSubmission with SWITCH_SOCKET action', () => {
        const params = makeBaseParams()
        switchAllSockets(params)
        expect(params.onAddPendingSubmission).toHaveBeenCalledWith(
          expect.objectContaining({ action: 'SWITCH_SOCKET' }),
        )
      })

      it('calls getSwitchAllSocketsParams with isOn=true', () => {
        switchAllSockets(makeBaseParams({ isOn: true }))
        expect(getSwitchAllSocketsParams).toHaveBeenCalledWith(true)
      })

      it('calls getSwitchAllSocketsParams with isOn=false', () => {
        switchAllSockets(makeBaseParams({ isOn: false }))
        expect(getSwitchAllSocketsParams).toHaveBeenCalledWith(false)
      })

      it('uses getSwitchAllSocketsParams result as params', () => {
        const params = makeBaseParams({ isOn: true })
        switchAllSockets(params)
        expect(params.onAddPendingSubmission).toHaveBeenCalledWith(
          expect.objectContaining({ params: ['all-on'] }),
        )
      })
    })

    describe('onResetSelections', () => {
      it('always calls onResetSelections', () => {
        const params = makeBaseParams()
        switchAllSockets(params)
        expect(params.onResetSelections).toHaveBeenCalledOnce()
      })
    })

    describe('notification', () => {
      it('notifies Switch All Sockets On', () => {
        switchAllSockets(makeBaseParams({ isOn: true }))
        expect(notifyInfo).toHaveBeenCalledWith('Action added', 'Switch All Sockets On')
      })

      it('notifies Switch All Sockets Off', () => {
        switchAllSockets(makeBaseParams({ isOn: false }))
        expect(notifyInfo).toHaveBeenCalledWith('Action added', 'Switch All Sockets Off')
      })
    })
  })
})
