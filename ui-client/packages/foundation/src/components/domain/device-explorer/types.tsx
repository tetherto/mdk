import type { Device } from '../../../types/device'

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

export { type Alert } from '../../../types/alerts'

export type DeviceExplorerDeviceType = 'container' | 'miner' | 'cabinet'
