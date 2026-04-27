import type { UnknownRecord } from '@mdk/core'
import { Indicator } from '@mdk/core'
import type { PumpItem } from '../pump-box/pump-box'
import { PumpBox } from '../pump-box/pump-box'
import { ContainerFansCard } from './container-fans-card/container-fans-card'

import type { ReactElement } from 'react'
import { DEVICE_STATUS } from '../../../../../../../../constants/devices'
import type { Device } from '../../../../../../../../types/device'
import { getContainerSpecificStats } from '../../../../../../../../utils/device-utils'
import './dry-cooler.scss'

const FANS_DATA = [
  { index: 0 },
  { index: 1 },
  { index: 2 },
  { index: 3 },
  { index: 4 },
  { index: 5 },
  { index: 6 },
  { index: 7 },
]

const getEmptyCoolerData = (): DryCoolerItem[] => [
  {
    index: 0,
    fans: FANS_DATA,
  },
  {
    index: 1,
    fans: FANS_DATA,
  },
]

type DryCoolerItem = {
  index: number
  enabled?: boolean
  fans: PumpItem[]
}

type DryCoolerProps = {
  data?: UnknownRecord
}

/**
 * Dry Cooler Component
 *
 * Displays dry cooler status with fans and associated pumps.
 * Shows two cooler groups with fan status indicators and pump controls.
 *
 * @example
 * ```tsx
 * <DryCooler data={containerData} />
 * ```
 */
export const DryCooler = ({ data }: DryCoolerProps): ReactElement => {
  // Extract cooling system data from container_specific stats
  const coolingSystem = getContainerSpecificStats(data as Device)?.cooling_system as
    | UnknownRecord
    | undefined

  // Extract dry cooler array data
  const dryCoolerDataRaw = coolingSystem?.dry_cooler
  const dryCoolerData: DryCoolerItem[] = Array.isArray(dryCoolerDataRaw) ? dryCoolerDataRaw : []

  // Extract pump arrays
  const oilPumpRaw = coolingSystem?.oil_pump
  const waterPumpRaw = coolingSystem?.water_pump
  const oilPump: PumpItem[] = Array.isArray(oilPumpRaw) ? oilPumpRaw : []
  const waterPump: PumpItem[] = Array.isArray(waterPumpRaw) ? waterPumpRaw : []

  const getSingleBlankCoolerData = (): DryCoolerItem[] => {
    const firstItem = dryCoolerData[0]
    if (!firstItem) return getEmptyCoolerData()

    return firstItem.index === 0
      ? [
          ...dryCoolerData,
          {
            index: 1,
            fans: FANS_DATA,
          },
        ]
      : [
          {
            index: 0,
            fans: FANS_DATA,
          },
          ...dryCoolerData,
        ]
  }

  const getCurrentCoolerData = (): DryCoolerItem[] => {
    if (dryCoolerData.length === 0) {
      return getEmptyCoolerData()
    }
    if (dryCoolerData.length === 1) {
      return getSingleBlankCoolerData()
    }
    return dryCoolerData
  }

  const currentCoolerData = getCurrentCoolerData()

  return (
    <div className="mdk-dry-cooler">
      {currentCoolerData.map((dryCoolerItem, index) => {
        const isEnabled = dryCoolerItem.enabled
        const hasEnabledValue = typeof isEnabled === 'boolean'
        const isRunning = isEnabled === true

        return (
          <div key={`${dryCoolerItem.index}-${index}`} className="mdk-dry-cooler__segment">
            <div className="mdk-dry-cooler__card">
              <div className="mdk-dry-cooler__status">
                <span className="mdk-dry-cooler__title">Dry Cooler {dryCoolerItem.index + 1}</span>
                {hasEnabledValue ? (
                  <Indicator color={isRunning ? 'green' : 'gray'} size="md">
                    {isRunning ? DEVICE_STATUS.RUNNING : DEVICE_STATUS.OFF}
                  </Indicator>
                ) : (
                  <Indicator color="gray" size="md">
                    Unavailable
                  </Indicator>
                )}
              </div>
              <ContainerFansCard fansData={dryCoolerItem.fans} />
            </div>

            <div className="mdk-dry-cooler__pumps">
              <PumpBox pumpItem={oilPump[index]} pumpTitle="Oil" />
              <PumpBox pumpItem={waterPump[index]} pumpTitle="Water" />
            </div>
          </div>
        )
      })}
    </div>
  )
}
