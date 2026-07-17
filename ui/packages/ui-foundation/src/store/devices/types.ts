/**
 * Shared types for the devices store and its slices.
 *
 * The store is split into focused slices (selection, containers, sockets,
 * filters, device-tags, lifecycle) but the public `DevicesStore` /
 * `DevicesState` / `DevicesActions` contract is unchanged — consumers keep
 * using the single `useDevices()` hook.
 *
 * @category devices
 */

export const NO_CONTAINER_KEY = 'NO_CONTAINER'

export type DevicePayload = {
  id: string
  [key: string]: unknown
}

export type SocketData = {
  containerId: string
  minerId: string
  pduIndex: number
  socketIndex: number
  miner: { id: string; [key: string]: unknown }
  [key: string]: unknown
}

export type DeviceTag = {
  isPosTag: boolean
  minerId: string
}

export type RemoveSocketPayload = {
  containerId: string
  minerId: string
}

export type DeviceTagPayload = {
  id: string
  info: { pos?: string; container?: string; [key: string]: unknown }
}

export type DevicesState = {
  selectedDevices: DevicePayload[]
  selectedSockets: Record<string, { sockets: SocketData[] }>
  filterTags: string[]
  selectedDevicesTags: Record<string, Record<string, DeviceTag>>
  selectedContainers: Record<string, DevicePayload>
  selectedLvCabinets: Record<string, DevicePayload>
}

export type DevicesActions = {
  selectContainer: (device: DevicePayload) => void
  selectLVCabinet: (device: DevicePayload) => void
  removeSelectedContainer: (device: DevicePayload) => void
  removeSelectedLVCabinet: (device: DevicePayload) => void
  selectMultipleContainers: (devices: DevicePayload[]) => void
  removeMultipleContainers: (devices: DevicePayload[]) => void
  setSelectedDevices: (devices: DevicePayload[]) => void
  setSelectedLvCabinets: (devices: Record<string, DevicePayload>) => void
  setMultipleSelectedDevices: (devices: DevicePayload[]) => void
  removeMultipleSelectedDevices: (deviceIds: string[]) => void
  setSelectDevice: (device: DevicePayload) => void
  removeSelectedDevice: (deviceId: string) => void
  setFilterTags: (tags: string[]) => void
  removeFilterTag: (tag: string) => void
  setSelectedSockets: (sockets: Record<string, { sockets: SocketData[] }>) => void
  setSelectSocket: (socket: SocketData) => void
  removeSelectedSocket: (payload: RemoveSocketPayload) => void
  setMultipleSelectedSockets: (sockets: SocketData[]) => void
  removeMultipleSelectedSockets: (sockets: SocketData[]) => void
  setResetSelections: () => void
  resetSelectedDevicesTags: () => void
  selectDeviceTag: (payload: DeviceTagPayload) => void
  removeDeviceTag: (payload: DeviceTagPayload) => void
}

export type DevicesStore = DevicesState & DevicesActions

export const getTags = (
  payload: DeviceTagPayload,
): { minerId: string; posTag: string | undefined; containerTag: string | undefined } => {
  const { id, info } = payload
  return { minerId: id, posTag: info.pos, containerTag: info.container }
}
