import type { Device } from '../types'
import { isContainer, isMiner } from '../utils/device-utils'

export type AvailableDevices = {
  availableContainerTypes: string[]
  availableMinerTypes: string[]
}

export type UseGetAvailableDevicesOptions = {
  data: Device[]
}

export const useGetAvailableDevices = ({
  data,
}: UseGetAvailableDevicesOptions): AvailableDevices => {
  const availableDevices: AvailableDevices = {
    availableContainerTypes: [],
    availableMinerTypes: [],
  }

  const devices = (data?.[0] ?? []) as Device[]

  for (const device of devices) {
    const type = (device as Record<string, unknown>)?.type as string | undefined
    if (!type) continue

    if (isContainer(type)) availableDevices.availableContainerTypes.push(type)

    if (isMiner(type)) availableDevices.availableMinerTypes.push(type)
  }

  return availableDevices
}
