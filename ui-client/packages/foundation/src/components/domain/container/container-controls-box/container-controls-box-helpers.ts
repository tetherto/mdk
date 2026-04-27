import { ACTION_TYPES, SUBMIT_ACTION_TYPES } from '../../../../constants/actions'
import { CROSS_THING_TYPES } from '../../../../constants/devices'
import type {
  PendingSubmission,
  UpdateExistedActionsParams,
} from '../../../../hooks/use-update-existed-actions'
import type { Device } from '../../../../types'
import { getSwitchAllSocketsParams } from '../../../../utils/action-utils'
import { appendContainerToTag, getOnOffText } from '../../../../utils/device-utils'
import { notifyInfo } from '../../../../utils/notification-utils'
import { getAllSelectedContainerInfo, getContainerActionPayload } from '../helper'

export type ContainerControlActionParams = {
  isOn: boolean
  isBatch: boolean
  selectedDevices: Device[]
  pendingSubmissions: PendingSubmission[]
  data: Device
  onUpdateExistedActions: (params: UpdateExistedActionsParams) => void
  onAddPendingSubmission: (params: unknown) => void
  onResetSelections: VoidFunction
}

type SwitchContainerParams = {
  shouldResetDevices?: boolean
} & ContainerControlActionParams

export const switchContainer = ({
  isOn,
  isBatch,
  selectedDevices,
  pendingSubmissions,
  data,
  onUpdateExistedActions,
  onAddPendingSubmission,
  onResetSelections,
  shouldResetDevices,
}: SwitchContainerParams) => {
  onUpdateExistedActions({
    actionType: ACTION_TYPES.SWITCH_CONTAINER,
    pendingSubmissions,
    selectedDevices,
  })
  onAddPendingSubmission({
    type: SUBMIT_ACTION_TYPES.VOTING,
    action: ACTION_TYPES.SWITCH_CONTAINER,
    tags: getContainerActionPayload(isBatch, selectedDevices, data as Device).idTags,
    params: [isOn],
  })
  if (shouldResetDevices) onResetSelections()

  notifyInfo('Action added', `Switch Container ${getOnOffText(isOn)}`)
}

export const switchCoolingSystem = ({
  isOn,
  isBatch,
  selectedDevices,
  pendingSubmissions,
  data,
  onUpdateExistedActions,
  onAddPendingSubmission,
  onResetSelections,
}: ContainerControlActionParams) => {
  onUpdateExistedActions({
    actionType: ACTION_TYPES.SWITCH_COOLING_SYSTEM,
    pendingSubmissions,
    selectedDevices,
  })
  onAddPendingSubmission({
    type: SUBMIT_ACTION_TYPES.VOTING,
    action: ACTION_TYPES.SWITCH_COOLING_SYSTEM,
    tags: getContainerActionPayload(isBatch, selectedDevices, data).idTags,
    params: [isOn],
    crossThing: {
      type: CROSS_THING_TYPES.MINER,
      params: {
        containers: getContainerActionPayload(isBatch, selectedDevices, data).containerInfo,
      },
    },
  })
  onResetSelections()
  notifyInfo('Action added', `Switch Cooling System ${getOnOffText(isOn)}`)
}

type SetTankEnabledParams = {
  tankNumber: string | number
} & ContainerControlActionParams

export const setTankEnabled = ({
  tankNumber,
  isOn,
  isBatch,
  selectedDevices,
  pendingSubmissions,
  data,
  onUpdateExistedActions,
  onAddPendingSubmission,
  onResetSelections,
}: SetTankEnabledParams) => {
  onUpdateExistedActions({
    actionType: ACTION_TYPES.SET_TANK_ENABLED,
    pendingSubmissions,
    selectedDevices,
  })
  onAddPendingSubmission({
    type: SUBMIT_ACTION_TYPES.VOTING,
    action: ACTION_TYPES.SET_TANK_ENABLED,
    tags: getContainerActionPayload(isBatch, selectedDevices, data as Device).idTags,
    params: [tankNumber, isOn],
  })
  onResetSelections()
  notifyInfo('Action added', `Set tank ${tankNumber} circulation ${getOnOffText(isOn)}`)
}

export const setAirExhaustEnabled = ({
  isOn,
  isBatch,
  selectedDevices,
  pendingSubmissions,
  data,
  onUpdateExistedActions,
  onAddPendingSubmission,
  onResetSelections,
}: ContainerControlActionParams) => {
  onUpdateExistedActions({
    actionType: ACTION_TYPES.SET_AIR_EXHAUST_ENABLED,
    pendingSubmissions,
    selectedDevices,
  })
  onAddPendingSubmission({
    type: SUBMIT_ACTION_TYPES.VOTING,
    action: ACTION_TYPES.SET_AIR_EXHAUST_ENABLED,
    tags: getContainerActionPayload(isBatch, selectedDevices, data as Device).idTags,
    params: [isOn],
  })
  onResetSelections()
  notifyInfo('Action added', `Set air exhaust ${getOnOffText(isOn)}`)
}

export const resetAlarm = ({
  isBatch,
  selectedDevices,
  pendingSubmissions,
  data,
  onUpdateExistedActions,
  onAddPendingSubmission,
  onResetSelections,
}: Omit<ContainerControlActionParams, 'isOn'>) => {
  onUpdateExistedActions({
    actionType: ACTION_TYPES.RESET_ALARM,
    pendingSubmissions,
    selectedDevices,
  })
  onAddPendingSubmission({
    type: SUBMIT_ACTION_TYPES.VOTING,
    action: ACTION_TYPES.RESET_ALARM,
    tags: getContainerActionPayload(isBatch, selectedDevices, data as Device).idTags,
    params: [],
  })
  onResetSelections()
  notifyInfo('Action added', 'Reset Alarm')
}

type getContainerActionPayloadParams = {
  isBatch: boolean
  devices: Device[]
  data: Device
}
export const getContainerPowerModeActionTags = ({
  isBatch,
  devices,
  data,
}: getContainerActionPayloadParams): string[] => {
  if (isBatch) return getAllSelectedContainerInfo(devices, true)
  const container = data?.info?.container
  return container ? [appendContainerToTag(container)] : []
}

type SetPowerModeParams = {
  powerMode: string
  shouldResetDevices?: boolean
  devices: Device[]
} & Omit<ContainerControlActionParams, 'isOn'>

export const setPowerMode = ({
  isBatch,
  selectedDevices,
  pendingSubmissions,
  data,
  onUpdateExistedActions,
  onAddPendingSubmission,
  onResetSelections,
  shouldResetDevices,
  devices,
  powerMode,
}: SetPowerModeParams) => {
  onUpdateExistedActions({
    actionType: ACTION_TYPES.SET_POWER_MODE,
    pendingSubmissions,
    selectedDevices,
  })
  onAddPendingSubmission({
    type: SUBMIT_ACTION_TYPES.VOTING,
    action: ACTION_TYPES.SET_POWER_MODE,
    tags: getContainerPowerModeActionTags({
      data,
      devices,
      isBatch,
    }),
    params: [powerMode],
    isBulkContainerAction: true,
    crossThing: {
      type: CROSS_THING_TYPES.CONTAINER,
      params: {
        containers: getContainerActionPayload(isBatch, selectedDevices, data as Device)
          .containerInfo,
      },
    },
  })
  if (shouldResetDevices) onResetSelections()
  notifyInfo('Action added', `Set Power Mode ${powerMode} for all devices`)
}

export const switchAllSockets = ({
  isOn,
  isBatch,
  selectedDevices,
  pendingSubmissions,
  data,
  onUpdateExistedActions,
  onAddPendingSubmission,
  onResetSelections,
}: ContainerControlActionParams) => {
  onUpdateExistedActions({
    actionType: ACTION_TYPES.SWITCH_SOCKET,
    pendingSubmissions,
    selectedDevices,
  })
  onAddPendingSubmission({
    type: SUBMIT_ACTION_TYPES.VOTING,
    action: ACTION_TYPES.SWITCH_SOCKET,
    tags: getContainerActionPayload(isBatch, selectedDevices, data as Device).idTags,
    params: getSwitchAllSocketsParams(isOn),
  })
  onResetSelections()
  notifyInfo('Action added', `Switch All Sockets ${getOnOffText(isOn)}`)
}
