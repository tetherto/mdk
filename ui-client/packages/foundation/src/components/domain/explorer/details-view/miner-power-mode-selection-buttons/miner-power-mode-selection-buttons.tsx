import type { UnknownRecord } from '@mdk/core'
import { cn } from '@mdk/core'
import type { FC } from 'react'
import type { Device } from '../../../../../types'
import { getDeviceModel } from '../../../../../utils/power-mode-utils'
import { getCurrentPowerModes } from '../miner-controls-card/miner-controls-utils'
import { PowerModeSelectionDropdown } from './power-mode-selection-dropdown'

type MinerPowerModeSelectionButtonsProps = {
  selectedDevices?: Device[]
  setPowerMode?: (devices: Device[], mode: string) => void
  connectedMiners?: Device[]
  powerModesLog?: UnknownRecord
  disabled?: boolean
  hasMargin?: boolean
}

const getPowerModesByKey = (
  key: string,
  powerModesLog: UnknownRecord | undefined,
  groupMinersByType: Record<string, Device[]>,
  connectedMiners: Device[] | undefined,
): Record<string, number> | undefined => {
  if (powerModesLog) {
    const value = powerModesLog[key]
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, number>)
      : undefined
  }

  return getCurrentPowerModes(
    groupMinersByType[key] as Device[],
    (connectedMiners ?? []) as Device[],
  )
}

export const MinerPowerModeSelectionButtons: FC<MinerPowerModeSelectionButtonsProps> = ({
  selectedDevices = [],
  setPowerMode,
  connectedMiners,
  powerModesLog,
  disabled,
  hasMargin = false,
}) => {
  const groupMinersByType = selectedDevices.reduce<Record<string, Device[]>>((acc, device) => {
    const key = getDeviceModel(device)
    if (!acc[key]) acc[key] = []
    acc[key].push(device)
    return acc
  }, {})

  const keys = Object.keys(groupMinersByType)

  return (
    <div
      className={cn(
        'mdk-miner-power-mode-selection-buttons',
        hasMargin && 'mdk-miner-power-mode-selection-buttons--with-margin',
      )}
    >
      {keys.map((key) => (
        <PowerModeSelectionDropdown
          key={key}
          disabled={disabled}
          currentPowerModes={getPowerModesByKey(
            key,
            powerModesLog,
            groupMinersByType,
            connectedMiners,
          )}
          buttonText={keys.length === 1 ? 'Set Power Mode' : `Set Power Mode (${key})`}
          model={key}
          onPowerModeToggle={(mode) => setPowerMode?.(groupMinersByType[key] ?? [], mode)}
        />
      ))}
    </div>
  )
}
