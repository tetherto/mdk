import type { Device } from '../../../../types'
import { getMinerShortCode } from '../../../../utils/device-utils'
import type { MinerRecord, RawDeviceStats } from '../types'

type PoolIdMap = Record<string, { name: string }>

type RawDeviceInfo = {
  container?: string
  poolConfig?: string
}

export const mapDeviceToMinerRecord = (device: Device, poolIdMap: PoolIdMap): MinerRecord => {
  const code = device.code
  const tags = device.tags ?? []
  const stats = device.last?.snap?.stats as RawDeviceStats
  const { container, poolConfig } = device.info as RawDeviceInfo
  const lastTs = device.last?.ts

  return {
    status: stats?.status,
    id: (device.id as string) ?? '',
    code: getMinerShortCode(code, tags),
    unit: container,
    hashrate: stats?.hashrate_mhs?.t_5m,
    lastSyncedAt: typeof lastTs === 'number' ? new Date(lastTs) : new Date(0),
    tags,
    pool: poolConfig ? poolIdMap[poolConfig]?.name : undefined,
    raw: device,
  }
}
