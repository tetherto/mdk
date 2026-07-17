import { useDevices } from "@tetherto/mdk-react-adapter"
import { MINER_TYPE_NAME_MAP } from "@tetherto/mdk-ui-foundation"
import { useMemo } from "react"

import type { InfoItem } from "../../components/info-container/info-container"
import { getContainerName } from "../../utils/container-utils"
import { getMinerShortCode, isMiner } from "../../utils/device-utils"
import type { ContainerStats, Device } from "../../types/device"

const readString = (value: unknown): string =>
  typeof value === "string" && value.length > 0 ? value : ""

const DASH = "-"

/** Shape the head miner into the label/value rows the {@link MinerInfoCard} renders. */
const buildInfoItems = (miner?: Device): InfoItem[] => {
  if (!miner) return []

  const config = (miner.last?.snap?.config ?? {}) as Record<string, unknown>
  const stats = (miner.last?.snap?.stats ?? {}) as Record<string, unknown>
  const info = miner.info ?? {}
  const network = (config.network_config ?? {}) as Record<string, unknown>

  const model =
    MINER_TYPE_NAME_MAP[miner.type as keyof typeof MINER_TYPE_NAME_MAP] ?? miner.type
  const location = `${getContainerName(info.container)} ${readString(info.pos)}`.trim()

  return [
    { title: "Code", value: getMinerShortCode(miner.code, miner.tags) },
    { title: "Model", value: model || DASH },
    { title: "Serial", value: readString(info.serialNum) || DASH },
    { title: "Firmware", value: readString(config.firmware_ver) || DASH },
    { title: "IP", value: readString(network.ip_address) || readString(miner.address) || DASH },
    { title: "Location", value: location || DASH },
    { title: "Power mode", value: readString(config.power_mode) || DASH },
    { title: "Status", value: readString(stats.status) || DASH },
  ]
}

export type UseMinerDetailResult = {
  /** The selected miners (post bridge dispatch). */
  miners: Device[]
  /** The first selected miner — drives the info / chips cards. */
  headMiner?: Device
  /** Label/value rows for {@link MinerInfoCard}. */
  infoItems: InfoItem[]
  /** The head miner's snapshot stats (`frequency_mhz` / `temperature_c` chips) for {@link MinerChipsCard}. */
  chipsData?: ContainerStats
}

/**
 * Reads the miner selection the `useExplorerSelection` bridge writes into
 * `devicesStore` and shapes the head miner for the read-only cards of the
 * miner detail panel — the info rows ({@link MinerInfoCard}) and the per-chip
 * frequency / temperature stats ({@link MinerChipsCard}). The write controls
 * ({@link MinerControlsCard}) and the aggregate stats ({@link StatsGroupCard})
 * read the same store directly.
 *
 * @category op-centre
 * @domain device-management
 * @tier advanced
 */
export const useMinerDetail = (): UseMinerDetailResult => {
  const { selectedDevices } = useDevices()

  const miners = useMemo(
    () => (selectedDevices as Device[]).filter((device) => isMiner(device.type)),
    [selectedDevices],
  )

  const headMiner = miners[0]
  const infoItems = useMemo(() => buildInfoItems(headMiner), [headMiner])
  const chipsData = headMiner?.last?.snap?.stats as ContainerStats | undefined

  return { miners, headMiner, infoItems, chipsData }
}
