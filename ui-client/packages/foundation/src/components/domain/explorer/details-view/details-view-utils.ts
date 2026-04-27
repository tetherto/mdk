import { ACTION_TYPES } from '../../../../constants/actions'
import type { PendingSubmission } from '../../../../hooks/use-update-existed-actions'
import type { Device } from '../../../../types'

type ButtonsStates = {
  isSetLedOnButtonDisabled: boolean
  isSetLedOffButtonDisabled: boolean
  isRebootButtonDisabled: boolean
  isSetupPoolsButtonDisabled: boolean
  isSetPowerModeButtonDisabled: boolean
  isSetUpFrequencyButtonDisabled: boolean
  isSetPlcRegistersEnableSystemButtonDisabled: boolean
  isSetPlcRegistersResetErrorButtonDisabled: boolean
  isSwitchCoolingSystemButtonDisabled: boolean
  isResetAlarmButtonDisabled: boolean
  isSwitchContainerButtonDisabled: boolean
  isResetContainerButtonDisabled: boolean
  isEmergencyStopButtonDisabled: boolean
  isMaintenanceButtonDisabled: boolean
  isSetTank1EnabledButtonDisabled: boolean
  isSetTank2EnabledButtonDisabled: boolean
  isSetAirExhaustEnabledButtonDisabled: boolean
  isSwitchSocketButtonDisabled: boolean
  [key: string]: boolean | undefined
}

type SocketInfo = {
  pduIndex: number
  socket: number
}

type GetButtonsStatesParams = {
  selectedDevices: Device[]
  pendingSubmissions: PendingSubmission[]
  selectedSockets?: Partial<Record<string, { sockets: SocketInfo[] }>>
}

const isSocketParamArray = (value: unknown): value is [number | string, number | string] =>
  Array.isArray(value) && value.length >= 2

const hasIntersection = (a: string[], b: string[]): boolean => {
  const setB = new Set(b)
  return a.some((item) => setB.has(item))
}

const unique = <T>(arr: T[]): T[] => [...new Set(arr)]

export const getButtonsStates = ({
  selectedDevices,
  pendingSubmissions,
  selectedSockets = {},
}: GetButtonsStatesParams): Partial<ButtonsStates> => {
  const allTags = unique(selectedDevices.flatMap((item) => item.tags ?? []))

  const pendingSocketsIds = pendingSubmissions.reduce<string[]>((acc, pendingSubmission) => {
    const containerTag = pendingSubmission.tags?.[0]
    if (!containerTag) return acc

    const currentContainerTag = containerTag.replace('container-', '')
    const params = pendingSubmission.params?.[0]
    if (!Array.isArray(params)) return acc

    const socketIds = params
      .filter(isSocketParamArray)
      .map(([pduIndex, socket]) => `${currentContainerTag}-${pduIndex}-${socket}`)

    return [...acc, ...socketIds]
  }, [])

  const selectedSocketsIds = Object.keys(selectedSockets).flatMap((container) =>
    selectedSockets[container]?.sockets.map(
      (socket) => `${container}-${socket.pduIndex}-${socket.socket}`,
    ),
  )

  const states = pendingSubmissions.reduce<Partial<ButtonsStates>>((acc, pendingSubmission) => {
    const doTagsMatch =
      hasIntersection(pendingSubmission.tags ?? [], allTags) ||
      hasIntersection(pendingSocketsIds, selectedSocketsIds as string[])

    switch (pendingSubmission.action) {
      case ACTION_TYPES.SET_LED: {
        const isOn = Boolean(pendingSubmission.params?.[0])
        return {
          ...acc,
          isSetLedOnButtonDisabled: doTagsMatch && isOn,
          isSetLedOffButtonDisabled: doTagsMatch && !isOn,
        }
      }

      case ACTION_TYPES.REBOOT:
        return { ...acc, isRebootButtonDisabled: doTagsMatch }

      case ACTION_TYPES.SETUP_POOLS:
        return { ...acc, isSetupPoolsButtonDisabled: doTagsMatch }

      case ACTION_TYPES.SET_POWER_MODE:
        return { ...acc, isSetPowerModeButtonDisabled: doTagsMatch }

      case ACTION_TYPES.SETUP_FREQUENCY_SPEED:
        return { ...acc, isSetUpFrequencyButtonDisabled: doTagsMatch }

      case ACTION_TYPES.SWITCH_COOLING_SYSTEM:
        return { ...acc, isSwitchCoolingSystemButtonDisabled: doTagsMatch }

      case ACTION_TYPES.RESET_ALARM:
        return { ...acc, isResetAlarmButtonDisabled: doTagsMatch }

      case ACTION_TYPES.SWITCH_CONTAINER:
        return { ...acc, isSwitchContainerButtonDisabled: doTagsMatch }

      case ACTION_TYPES.RESET_CONTAINER:
        return { ...acc, isResetContainerButtonDisabled: doTagsMatch }

      case ACTION_TYPES.EMERGENCY_STOP:
        return { ...acc, isEmergencyStopButtonDisabled: doTagsMatch }

      case ACTION_TYPES.MAINTENANCE:
        return { ...acc, isMaintenanceButtonDisabled: doTagsMatch }

      case ACTION_TYPES.SET_TANK_ENABLED: {
        const tankId = pendingSubmission.params?.[0]
        return { ...acc, [`isSetTank${tankId}EnabledButtonDisabled`]: doTagsMatch }
      }

      case ACTION_TYPES.SET_AIR_EXHAUST_ENABLED:
        return { ...acc, isSetAirExhaustEnabledButtonDisabled: doTagsMatch }

      case ACTION_TYPES.SWITCH_SOCKET:
        return { ...acc, isSwitchSocketButtonDisabled: doTagsMatch }

      default:
        return acc
    }
  }, {})

  return states
}
