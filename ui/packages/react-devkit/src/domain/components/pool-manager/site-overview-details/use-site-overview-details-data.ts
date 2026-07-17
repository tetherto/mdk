import { UNITS } from '@primitives'
import type { ListThingsDevice } from '@tetherto/mdk-ui-foundation'
import type { ContainerInfo, Device, DeviceLast } from '../../../types'
import { getDeviceData, getHashrateUnit } from '../../../utils/device-utils'
import { CONTAINER_STATUS } from '../../../utils/status-utils'

export type PduSocket = {
  socket: string | number
  enabled: boolean
  cooling?: boolean
}

export type Pdu = {
  pdu: string
  power_w?: number | string
  current_a?: number | string
  sockets?: PduSocket[]
  offline?: boolean
}

export type MinerHashrate = {
  value?: string | number | null
  unit?: string
  realValue?: number
}

export type MinerData = {
  id: string
  hashrate: MinerHashrate
  error?: string
  type?: string
  info?: {
    poolConfig?: string
  }
  snap?: {
    config?: {
      power_mode: string
      [key: string]: unknown
    }
    stats?: {
      status?: string
      [key: string]: unknown
    }
  }
  [key: string]: unknown
}

export type UseSiteOverviewDetailsDataResult = {
  actualMinersCount: number
  containerHashRate: string
  pdus: Pdu[]
  segregatedPduSections: Record<string, Pdu[]>
  minersHashmap: Record<string, MinerData>
  connectedMiners: ListThingsDevice[] | undefined
  containerInfo: ContainerInfo
  connectedMinersData: Partial<ContainerInfo[]>
  isContainerRunning: boolean
  isLoading: boolean
}

export type SiteOverviewDetailsDataOptions = {
  pdus?: Pdu[]
  connectedMiners?: ListThingsDevice[]
  connectedMinersData?: Partial<ContainerInfo[]>
  containerHashRate?: string
  actualMinersCount?: number
  isLoading?: boolean
}

type UnitInfo = {
  container?: string
  nominalMinerCapacity?: string
  [key: string]: unknown
}

type UnitLast = {
  snap?: {
    stats?: {
      status?: string
      [key: string]: unknown
    }
    [key: string]: unknown
  }
  [key: string]: unknown
}

export type UnitData = {
  last?: UnitLast
  type?: string
  info?: UnitInfo
  [key: string]: unknown
}

const getConnectedMinerForSocket = (
  miners: ListThingsDevice[],
  pduIndex: string,
  socketIndex: string,
): ListThingsDevice | undefined =>
  miners.find((miner) => {
    const info = miner?.info

    if (!info?.pos) return false

    const lastSep = info.pos.lastIndexOf('_')

    if (lastSep === -1) return false

    const pdu = info.pos.substring(0, lastSep)
    const socket = info.pos.substring(lastSep + 1)

    return pdu === pduIndex && socket === socketIndex
  })

const buildSegregatedPduSections = (pdus: Pdu[]): Record<string, Pdu[]> => {
  const result: Record<string, Pdu[]> = {}
  for (const pdu of pdus) {
    const pduString = pdu?.pdu

    if (!pduString) continue

    const parts = pduString.split('_')

    if (parts.length <= 1) {
      result.Racks = result.Racks ?? []
      result.Racks.push(pdu)
    } else {
      const key = parts[0] as string
      result[key] = result[key] ?? []
      result[key].push(pdu)
    }
  }
  return result
}

const buildMinersHashmap = (
  pdus: Pdu[],
  connectedMiners: ListThingsDevice[],
  type: string | undefined,
): Record<string, MinerData> => {
  const result: Record<string, MinerData> = {}

  for (const pdu of pdus) {
    for (const socket of pdu?.sockets ?? []) {
      const pduIndex = pdu?.pdu
      const socketIndex = socket?.socket
      if (!pduIndex || socketIndex === undefined) continue

      const miner = getConnectedMinerForSocket(connectedMiners, pduIndex, String(socketIndex))
      const [error, data] = getDeviceData((miner ?? null) as Device | null | undefined)
      const hashrate = (data?.snap as { stats?: DeviceLast })?.stats?.hashrate_mhs as
        | { t_5m?: number }
        | undefined
      const formattedHashrate = getHashrateUnit(hashrate?.t_5m ?? 0)

      const key = `${pduIndex}_${socketIndex}`
      result[key] = {
        ...(miner ?? {}),
        id: miner?.id ?? '',
        hashrate: formattedHashrate,
        type,
        error,
        snap: miner?.last?.snap,
      } as unknown as MinerData
    }
  }

  return result
}

/**
 * Composes the per-site overview view-model: pools, performance series, and recent activity.
 *
 * @category dashboards
 * @domain mining-operations
 * @kernelCapability hashrate-monitoring
 * @tier agent-ready
 */
export const useSiteOverviewDetailsData = (
  unit?: UnitData,
  options: SiteOverviewDetailsDataOptions = {},
): UseSiteOverviewDetailsDataResult => {
  const { last, type, info } = unit ?? {}

  const pdus = options.pdus ?? []
  const connectedMiners = options.connectedMiners ?? []
  const connectedMinersData = options.connectedMinersData ?? []
  const containerHashRate = options.containerHashRate ?? `0 ${UNITS.HASHRATE_PH_S}`
  const actualMinersCount = options.actualMinersCount ?? 0
  const isLoading = options.isLoading ?? false

  const segregatedPduSections = buildSegregatedPduSections(pdus)
  const minersHashmap = buildMinersHashmap(pdus, connectedMiners, type)

  const containerInfo = {
    ...(info ?? {}),
    container: info?.container ?? '',
    type,
  } as ContainerInfo

  const isContainerRunning = last?.snap?.stats?.status === CONTAINER_STATUS.RUNNING

  return {
    actualMinersCount,
    containerHashRate,
    pdus,
    segregatedPduSections,
    minersHashmap,
    connectedMiners: connectedMiners.length > 0 ? connectedMiners : undefined,
    containerInfo,
    connectedMinersData,
    isContainerRunning,
    isLoading,
  }
}
