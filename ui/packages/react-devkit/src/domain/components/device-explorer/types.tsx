import type { Device } from '../../types/device'

export type GetColumnConfigParams = {
  getFormattedDate: (date: Date) => string
  renderAction: (device: DeviceExplorerDeviceData) => React.ReactNode
}

export type DeviceExplorerFilterOption = {
  value: string
  label: string
  children?: DeviceExplorerFilterOption[]
}

export type DeviceExplorerSearchOption = {
  value: string
  label: string
}

export type DeviceExplorerDeviceData = Device

export { type Alert } from '../../types/alerts'

/**
 * The Explorer tabs — one per device kind the list can page through. Named
 * constants for the {@link DeviceExplorerDeviceType} union so callers branch on
 * `DEVICE_EXPLORER_DEVICE_TYPE.CONTAINER` instead of a bare string literal.
 *
 * @tier internal
 */
export const DEVICE_EXPLORER_DEVICE_TYPE = {
  CONTAINER: 'container',
  MINER: 'miner',
  CABINET: 'cabinet',
} as const

export type DeviceExplorerDeviceType =
  (typeof DEVICE_EXPLORER_DEVICE_TYPE)[keyof typeof DEVICE_EXPLORER_DEVICE_TYPE]
