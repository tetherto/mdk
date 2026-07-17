import { isContainer, isMiner } from '@tetherto/mdk-ui-foundation'

/**
 * Minimal device shape consumed by `useGetAvailableDevices` — only `type`
 * is read. The shell typically passes its richer `Device[]` rows through
 * verbatim and TypeScript narrows them down to this structural fit.
 */
export type AvailableDevicesInput = {
  type?: string
  [key: string]: unknown
}

export type AvailableDevices = {
  availableContainerTypes: string[]
  availableMinerTypes: string[]
}

export type UseGetAvailableDevicesOptions = {
  data: AvailableDevicesInput[] | AvailableDevicesInput[][]
}

/**
 * Pure projector turning a flat device list (or the `/auth/list-things`
 * nested shape) into the two type-buckets the device-explorer toolbar
 * needs.
 *
 * Lives in `react-adapter` because the layering rule keeps device-shape
 * knowledge — including the `miner-` / `container-` prefix predicates —
 * out of the React component layer. Components should call this hook (or
 * receive its output via prop) instead of inlining `isMiner` / `isContainer`.
 *
 * @category dashboard
 */
export const useGetAvailableDevices = ({
  data,
}: UseGetAvailableDevicesOptions): AvailableDevices => {
  const availableDevices: AvailableDevices = {
    availableContainerTypes: [],
    availableMinerTypes: [],
  }

  const first = Array.isArray(data) ? data[0] : data
  const devices = Array.isArray(first)
    ? (first as AvailableDevicesInput[])
    : (data as AvailableDevicesInput[])

  for (const device of devices ?? []) {
    const type = device?.type
    if (!type) continue
    if (isContainer(type)) availableDevices.availableContainerTypes.push(type)
    if (isMiner(type)) availableDevices.availableMinerTypes.push(type)
  }

  return availableDevices
}
