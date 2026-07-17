import type { ListThingsDevice } from '@tetherto/mdk-ui-foundation'
import { getMinerShortCode } from '../../../utils/device-utils'
import type { MinerRecord, RawDeviceStats } from '../types'

type PoolIdMap = Record<string, { name: string }>

type RawDeviceInfo = {
  container?: string
  poolConfig?: string
}

export const mapDeviceToMinerRecord = (device: ListThingsDevice, poolIdMap: PoolIdMap): MinerRecord => {
  const tags = device.tags ?? []
  const info = (device.info ?? {}) as RawDeviceInfo
  const stats = (device.last?.snap?.stats ?? {}) as RawDeviceStats

  // Support both the nested list-things `Device` shape and the flat, app-
  // normalised `/auth/miners` row (no `info` / `last.snap`). `Device` carries
  // `[key: string]: unknown` so flat fields are accessible via index access.
  const rawHashrate = device.hashrate as number | { t_5m?: number } | undefined
  const flatHashrate = typeof rawHashrate === 'number' ? rawHashrate : rawHashrate?.t_5m
  const lastTs = device.last?.ts ?? (device.lastSeen as number | undefined)
  // The flat row's `poolConfig` is an array of resolved endpoints rather than a
  // config id, so pool-name resolution only applies to the nested shape.
  const poolConfigId = typeof info.poolConfig === 'string' ? info.poolConfig : undefined

  return {
    status: stats.status ?? (device.status as string | undefined),
    id: (device.id as string) ?? '',
    code: getMinerShortCode(device.code, tags),
    unit: info.container ?? (device.container as string | undefined),
    hashrate: stats.hashrate_mhs?.t_5m ?? flatHashrate,
    lastSyncedAt: typeof lastTs === 'number' ? new Date(lastTs) : new Date(0),
    tags,
    pool: poolConfigId ? poolIdMap[poolConfigId]?.name : undefined,
    raw: device,
  }
}
