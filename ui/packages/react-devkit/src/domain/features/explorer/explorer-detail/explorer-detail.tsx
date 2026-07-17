import { useDevices } from "@tetherto/mdk-react-adapter"
import { useMemo } from "react"

import { DEVICE_EXPLORER_DEVICE_TYPE } from "../../../components/device-explorer/types"
import type { DeviceExplorerDeviceType } from "../../../components/device-explorer/types"
import { AlarmContents } from "../../../components/alarm/alarm-contents/alarm-contents"
import { ContentBox } from "../../../components/container/content-box/content-box"
import {
  BatchContainerControlsCard,
  CabinetDetailCard,
  ContainerControlsCard,
  MinerChipsCard,
  MinerControlsCard,
  MinerInfoCard,
  StatsGroupCard,
} from "../../../components/explorer/details-view"
import type { Device } from "../../../types/device"
import { useCabinetDetail } from "../use-cabinet-detail"
import { useDeviceAlarms } from "../use-device-alarms"
import { useMinerDetail } from "../use-miner-detail"
import "./explorer-detail.scss"

export type ExplorerDetailProps = {
  /** The active Explorer tab — selects which per-type panel renders. */
  deviceType: DeviceExplorerDeviceType
  /** Router navigate used by alarm rows to deep-link into `/alerts/:id`. */
  onNavigate?: (path: string) => void
  /** Compact layout for the narrower Explorer detail column. */
  isCompact?: boolean
}

/**
 * Per-type Explorer detail panel. Reads the selection the
 * `useExplorerSelection` bridge writes into `devicesStore` and composes the
 * matching cards:
 *
 * - **container:** {@link BatchContainerControlsCard} (batch when >1 selected)
 *   with the connected-miner power-mode controls and the active-alarms box,
 *   plus {@link StatsGroupCard} for the connected miners and
 *   {@link ContainerControlsCard} when an explicit per-socket selection exists.
 * - **miner:** {@link MinerControlsCard} write controls, {@link MinerInfoCard}
 *   read-only info rows, {@link MinerChipsCard} per-chip stats,
 *   {@link StatsGroupCard} aggregate, and the active-alarms box.
 * - **cabinet:** read-only {@link CabinetDetailCard} — powermeter + temperature
 *   readings and the LV-cabinet warnings timeline.
 *
 * Writes queue into the actions draft store; submission stays gated behind the
 * `ActionsSidebar`.
 *
 * @category widgets
 * @domain device-management
 * @kernelCapability device-management
 * @tier agent-ready
 */
export const ExplorerDetail = ({
  deviceType,
  onNavigate = () => {},
  isCompact = true,
}: ExplorerDetailProps) => {
  const { selectedContainers, selectedSockets } = useDevices()
  const { miners, chipsData, infoItems } = useMinerDetail()
  const cabinet = useCabinetDetail(onNavigate)

  const selectedContainerDevices = useMemo(
    () => Object.values(selectedContainers) as Device[],
    [selectedContainers],
  )

  // Connected miners come from the per-socket selection's joined miners — the
  // same source the reference app feeds the power-mode buttons and the stats aggregate.
  const connectedMiners = useMemo(
    () =>
      Object.values(selectedSockets)
        .flatMap((container) => container?.sockets ?? [])
        .map((socket) => socket?.miner)
        .filter((miner): miner is Device => Boolean(miner)) as Device[],
    [selectedSockets],
  )

  // Alarms are shaped from whichever selection drives the active tab.
  const alarmDevices =
    deviceType === DEVICE_EXPLORER_DEVICE_TYPE.MINER ? miners : selectedContainerDevices
  const { alarmsDataItems } = useDeviceAlarms(alarmDevices, onNavigate)

  if (deviceType === DEVICE_EXPLORER_DEVICE_TYPE.CONTAINER) {
    const isBatch = selectedContainerDevices.length > 1

    return (
      <div className="mdk-explorer-detail">
        <BatchContainerControlsCard
          isBatch={isBatch}
          isCompact={isCompact}
          connectedMiners={connectedMiners}
          alarmsDataItems={alarmsDataItems}
          onNavigate={onNavigate}
        />
        {connectedMiners.length > 0 && <StatsGroupCard miners={connectedMiners} />}
        <ContainerControlsCard isLoading={false} />
      </div>
    )
  }

  if (deviceType === DEVICE_EXPLORER_DEVICE_TYPE.MINER) {
    if (miners.length === 0) return null

    return (
      <div className="mdk-explorer-detail">
        <MinerControlsCard buttonsStates={{}} isLoading={false} />
        <StatsGroupCard miners={miners} />
        {miners.length === 1 && <MinerInfoCard data={infoItems} />}
        {miners.length === 1 && chipsData && <MinerChipsCard data={chipsData} />}
        <ContentBox title="Active Alarms">
          <AlarmContents alarmsData={alarmsDataItems} onNavigate={onNavigate} />
        </ContentBox>
      </div>
    )
  }

  if (deviceType === DEVICE_EXPLORER_DEVICE_TYPE.CABINET) {
    if (!cabinet.hasSelection) return null

    return (
      <div className="mdk-explorer-detail">
        <CabinetDetailCard
          title={cabinet.title}
          powerMeters={cabinet.powerMeters}
          rootTempSensor={cabinet.rootTempSensor}
          tempSensors={cabinet.tempSensors}
          alarmsDataItems={cabinet.alarmsDataItems}
          onNavigate={onNavigate}
          isLoading={cabinet.isLoading}
        />
      </div>
    )
  }

  return null
}
