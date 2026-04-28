import type { UnknownRecord } from '@tetherto/mdk-core-ui'
import { MINER_TYPE, MinerStatuses } from '../../../../../constants/device-constants'
import type { Device } from '../../../../../types'
import { getMinerTypeFromContainerType } from '../../../../../utils/container-utils'
import { MINER_POWER_MODE } from '../../../../../utils/status-utils'

export const getCurrentPowerModes = (
  selectedDevices: Array<Device>,
  connectedMiners: Array<Device>,
): Record<string, number> => {
  const devices = connectedMiners.length > 0 ? connectedMiners : selectedDevices

  return devices.reduce<Record<string, number>>((accum, device) => {
    const snap = device?.last?.snap
    const stats = snap?.stats
    const config = snap?.config

    const deviceStatus = stats?.status as string | undefined
    const powerMode = config?.power_mode as string | undefined

    const resultMode = deviceStatus === MinerStatuses.SLEEPING ? MINER_POWER_MODE.SLEEP : powerMode

    if (!resultMode) return accum

    return {
      ...accum,
      [resultMode]: accum[resultMode] ? accum[resultMode] + 1 : 1,
    }
  }, {})
}

export const getDefaultSelectedPowerModes = (
  currentPowerModes: Record<string, number>,
): (string | undefined)[] => {
  const keys = Object.keys(currentPowerModes)
  return keys.length === 1 ? [keys[0]] : []
}

export const getLedButtonsStatus = (
  selectedDevices: Array<Device>,
): { isLedOnButtonEnabled: boolean; isLedOffButtonEnabled: boolean } => {
  const getLedStatus = (device: Device): unknown =>
    device?.last?.snap
      ? device?.last?.snap?.config
        ? device?.last?.snap?.config?.led_status
        : undefined
      : undefined

  const isAnyLedOn = selectedDevices.some((device) => {
    const ledStatus = getLedStatus(device)
    return typeof ledStatus === 'boolean' ? ledStatus : true
  })

  const isAnyLedOff = selectedDevices.some((device) => {
    const ledStatus = getLedStatus(device)
    return typeof ledStatus !== 'boolean' || ledStatus === false
  })

  return {
    isLedOnButtonEnabled: isAnyLedOff,
    isLedOffButtonEnabled: isAnyLedOn,
  }
}

const getContainerDeviceFromContainerTag = (
  selectedDevices: Array<Device>,
  tag: string,
): Device | undefined =>
  selectedDevices.find(
    (device) => (device?.info as { container?: string } | undefined)?.container === tag,
  )

type MinerTypeResult = {
  normal: number
  high: number
  low: number
  sleep: number
  offline: number
}

export const groupTailLogByMinersByType = (
  selectedDevices: Array<Device>,
  tailLogData: Array<UnknownRecord>,
): Record<string, MinerTypeResult> => {
  const resultBaseObject: MinerTypeResult = {
    normal: 0,
    high: 0,
    low: 0,
    sleep: 0,
    offline: 0,
  }

  const result: Record<string, MinerTypeResult> = {
    [MINER_TYPE.AVALON]: { ...resultBaseObject },
    [MINER_TYPE.ANTMINER]: { ...resultBaseObject },
    [MINER_TYPE.WHATSMINER]: { ...resultBaseObject },
  }

  for (const [mode, containers] of Object.entries(tailLogData)) {
    const containersObj = containers as UnknownRecord

    for (const [containerTag, count] of Object.entries(containersObj)) {
      const containerDevice = getContainerDeviceFromContainerTag(selectedDevices, containerTag)
      const deviceType = containerDevice?.type as string | undefined
      const type = deviceType ? getMinerTypeFromContainerType(deviceType) : undefined

      if (!type) continue

      const powerMode = mode.replace(/(power_mode_)?([^_]*)_cnt/, '$2')
      const typeResult = result[type as keyof typeof result]

      if (typeResult) {
        const currentValue = (typeResult[powerMode as keyof MinerTypeResult] ?? 0) as number
        typeResult[powerMode as keyof MinerTypeResult] = (currentValue + Number(count)) as never
      }
    }
  }

  return result
}

type RecreateSubmissionParams = {
  pendingSubmissions?: unknown[]
  selectedDevicesTags?: string[]
  action?: string
  [key: string]: unknown
}

type RecreateResult = {
  remove: (string | number)[]
  add: string[]
}

export const recreateSubmission = (
  params?: RecreateSubmissionParams,
): { add: string[] | undefined } | RecreateResult => {
  if (!params) {
    throw new Error('Params should not be undefined')
  }

  const { pendingSubmissions = [], selectedDevicesTags = [], action } = params

  const currentActionSubmissions = pendingSubmissions.filter(
    (s) => (s as { action?: string })?.action === action,
  )

  if (currentActionSubmissions.length === 0) {
    return { add: selectedDevicesTags }
  }

  return currentActionSubmissions.reduce<RecreateResult>(
    (acc, submission) => {
      const submissionObj = submission as { tags?: string[]; id?: string | number }
      const tags = submissionObj.tags ?? []
      const intersection = tags.filter((t) => selectedDevicesTags.includes(t))

      if (intersection.length === 0) return acc

      return {
        remove: submissionObj.id
          ? [submissionObj.id, ...acc.remove, ...intersection]
          : [...acc.remove, ...intersection],
        add: [...acc.add, ...[...new Set([...intersection, ...selectedDevicesTags])]],
      }
    },
    { remove: [], add: [] },
  )
}
