import type { Alert } from './alerts'

export type DeviceLast = {
  err?: string | null
  type?: string
  snap?: ContainerSnap
  alerts?: Alert[] | null
  [key: string]: unknown
}

export type PosHistoryEntry = {
  container: string
  pos: string
  removedAt: number
}
export type DeviceInfo = {
  container?: string
  pos?: string
  poolConfig?: string
  serialNum?: string
  macAddress?: string | null
  posHistory?: Partial<PosHistoryEntry[]>
  [key: string]: unknown
}

export type Device = {
  id: string
  type: string
  tags?: string[]
  rack?: string
  last?: DeviceLast
  username?: string
  info?: DeviceInfo
  containerId?: string
  address?: string | null
  code?: string
  alerts?: Alert[] | null
  powerMeters?: Device[]
  tempSensors?: Device[]
  transformerTempSensor?: Device
  rootTempSensor?: Device
  err?: string | null
  [key: string]: unknown
}

export type DeviceData = {
  id: string | undefined
  type: string | undefined
  tags?: string[]
  rack?: string
  snap: ContainerSnap
  alerts?: Alert[] | null
  username?: string
  info?: DeviceInfo
  containerId?: string
  address?: string | null
  err?: string | null
  [key: string]: unknown
}

export type ContainerInfo = {
  container: string
  cooling_system: Record<string, unknown>
  cdu: Record<string, unknown>
  primary_supply_temp: number
  second_supply_temp1: number
  second_supply_temp2: number
  supply_liquid_temp: number
  supply_liquid_set_temp: number
  supply_liquid_pressure: number
  return_liquid_pressure: number
}

export type ContainerPosInfo = {
  containerInfo: Partial<{ container: string; type: string }>
  pdu: string | number
  socket: string | number
  pos: string
  [key: string]: unknown
}

export type ChipData = {
  index: number
  current: number
}

export type TempChipData = {
  index: number
  max?: number
  min?: number
  avg?: number
}

export type StatsTemperatureC = {
  avg: number
  min: number
  max: number
  chips: TempChipData[]
  [key: string]: unknown
}

export type StatsFrequencyMhz = {
  avg: number
  chips: ChipData[]
  [key: string]: unknown
}

export type MinerSpecificStats = {
  upfreq_speed: number
  [key: string]: unknown
}

export type ContainerPduData = {
  power_w: number
  status: number
}

export type ContainerSpecific = {
  pdu_data: Partial<ContainerPduData>[]
  [key: string]: unknown
}

export type ContainerStats = {
  status: string
  ambient_temp_c: number
  humidity_percent: number
  power_w: number
  container_specific: Partial<ContainerSpecific>
  distribution_box1_power_w: number
  distribution_box2_power_w: number
  stats: Record<string, unknown>
  temperature_c: Partial<StatsTemperatureC>
  frequency_mhz: Partial<StatsFrequencyMhz>
  miner_specific: Partial<MinerSpecificStats>
  [key: string]: unknown
}

export type ContainerLast = {
  snap: {
    stats?: Partial<ContainerStats>
  }
  alerts: unknown[] | null
  err: string | null
}

export type Container = {
  info?: Partial<ContainerInfo>
  last?: Partial<ContainerLast>
} & Device

export type PowerMeter = {
  last?: {
    snap?: {
      stats?: {
        power_w?: number
      }
    }
  }
}

export type LvCabinetRecord = {
  id: string
  powerMeters?: PowerMeter[]
}

export type ContainerSnap = {
  stats?: Partial<ContainerStats>
  config?: Record<string, unknown>
}

export type MinerHashrateMhs = {
  t_5m?: number
}

export type MinerInfo = {
  container?: string
  pos?: string
  macAddress?: string
  serialNum?: string
}

export type MinerStats = {
  status?: string
  uptime_ms?: number
  power_w?: number
  hashrate_mhs?: MinerHashrateMhs
  poolHashrate?: string
  temperature_c?: { max?: number }
}

export type MinerConfig = {
  firmware_ver?: string
  power_mode?: string
  led_status?: boolean
}

export type MinerDeviceSnapshot = {
  last?: { snap?: { config?: MinerConfig } }
}

export type MinerRecord = {
  id?: string
  shortCode?: string
  info?: MinerInfo
  address?: string
  type?: string
  alerts?: unknown[]
  stats?: MinerStats
  config?: MinerConfig
  device?: MinerDeviceSnapshot
  error?: string
  err?: string
  isPoolStatsEnabled?: boolean
}
