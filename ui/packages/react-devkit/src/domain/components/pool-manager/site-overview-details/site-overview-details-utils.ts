import { MinerStatuses } from '../../../constants/device-constants'
import type { MinerData, Pdu, PduSocket } from './use-site-overview-details-data'
import type { Device } from '../../../types'
import { DEVICE_NOT_FOUND_MESSAGE } from '../../../utils/device-utils'
import type { SITE_OVERVIEW_STATUS_COLORS } from '../pool-manager-constants'
import { POOL_SETUPPABLE_MINERS_STATUSES, SITE_OVERVIEW_STATUSES } from '../pool-manager-constants'

export type SiteOverviewStatus = keyof typeof SITE_OVERVIEW_STATUS_COLORS

export type SelectedSocketItem = {
  pduIndex: string
  socketIndex: string
}

export type ResolveAssignPoolDevicesResult = {
  devices: Device[]
  hasEligibleDevices: boolean
}

export type MinerStatusInput = {
  error?: string
  snap?: {
    stats?: {
      status?: string
    }
  }
}

export const getMinersPoolName = (miners?: Device[]): string => {
  const config = miners?.find((miner) => !!miner?.last?.snap?.config)?.last?.snap?.config as
    | { pool_config?: { url?: string }[] }
    | undefined

  const poolUrl = config?.pool_config?.[0]?.url
  if (!poolUrl) return ''

  let hostname: string
  try {
    hostname = new URL(poolUrl).hostname
  } catch {
    return ''
  }

  const parts = hostname.split('.').reverse()
  return parts[1] ?? ''
}

export const getMinerStatus = (miner?: MinerStatusInput): SiteOverviewStatus => {
  if (!miner || miner.error === DEVICE_NOT_FOUND_MESSAGE) {
    return SITE_OVERVIEW_STATUSES.EMPTY
  }

  const status = miner.snap?.stats?.status

  if (status === MinerStatuses.NOT_MINING) return SITE_OVERVIEW_STATUSES.NOT_MINING
  if (status === MinerStatuses.MINING) return SITE_OVERVIEW_STATUSES.MINING

  return SITE_OVERVIEW_STATUSES.OFFLINE
}

export const getUnitRowLabel = (pdu: Pdu): string => `Rack ${pdu.pdu}`

export type SocketHelperParams = {
  minersHashmap: Record<string, MinerData>
  pdu: Pdu
  socket: PduSocket
}

export const getMinerInSocket = ({ minersHashmap, pdu, socket }: SocketHelperParams) =>
  minersHashmap[`${pdu.pdu}_${socket.socket}`]

export const getSocketStatus = ({
  minersHashmap,
  pdu,
  socket,
}: SocketHelperParams): keyof typeof SITE_OVERVIEW_STATUS_COLORS =>
  getMinerStatus(getMinerInSocket({ minersHashmap, pdu, socket }))

export const socketHasMiner = ({ minersHashmap, pdu, socket }: SocketHelperParams): boolean => {
  const miner = getMinerInSocket({ minersHashmap, pdu, socket })
  return miner ? miner.error !== DEVICE_NOT_FOUND_MESSAGE : false
}

export const getSelectableName = (pduIndex: string, socketIndex: string | number): string =>
  JSON.stringify({ pduIndex, socketIndex: String(socketIndex) })

export const resolveAssignPoolDevices = (
  selectedItems: Set<string>,
  minersHashmap: Record<string, MinerData>,
  connectedMiners: Device[] | undefined,
): ResolveAssignPoolDevicesResult => {
  const devices: Device[] = []

  for (const name of selectedItems) {
    const parsed = JSON.parse(name) as SelectedSocketItem
    const { pduIndex, socketIndex } = parsed

    const miner = minersHashmap[`${pduIndex}_${socketIndex}`]
    if (!miner?.id) continue

    const isEligible = (POOL_SETUPPABLE_MINERS_STATUSES as readonly string[]).includes(
      miner.snap?.stats?.status ?? '',
    )
    if (!isEligible) continue

    const connectedMiner = connectedMiners?.find((d) => d.id === miner.id)
    if (connectedMiner) {
      devices.push(connectedMiner)
    }
  }

  return { devices, hasEligibleDevices: devices.length > 0 }
}
