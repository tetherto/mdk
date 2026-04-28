import type { UnknownRecord } from '@tetherto/core'
import { UNITS } from '@tetherto/core'
import type { ReactElement } from 'react'
import type { Device } from '../../../../types/device'
import { getContainerSpecificStats, getStats } from '../../../../utils/device-utils'
import { SingleStatCard } from '../../explorer/details-view'
import {
  getAntspaceSupplyLiquidPressureColor,
  getAntspaceSupplyLiquidTemperatureColor,
  shouldAntspacePressureFlash,
  shouldAntspacePressureSuperflash,
  shouldAntspaceSupplyLiquidTempFlash,
  shouldAntspaceSupplyLiquidTempSuperflash,
} from '../../explorer/containers/bitmain/bitmain-hydro-utils'
import { firstNumeric } from './supply-liquid-box.utils'
import './supply-liquid-box.scss'

export type SupplyLiquidBoxContainerSettings = {
  thresholds?: Record<string, UnknownRecord>
}

export type SupplyLiquidBoxProps = {
  data?: Device
  containerSettings?: SupplyLiquidBoxContainerSettings | null
}

export const SupplyLiquidBox = ({
  data,
  containerSettings = null,
}: SupplyLiquidBoxProps): ReactElement | null => {
  if (!data) {
    return null
  }

  const stats = getStats(data)
  const containerStats = getContainerSpecificStats(data)
  const status = String(stats.status ?? data.status ?? '')

  const supplyLiquidTemp = firstNumeric(
    stats.supply_liquid_temp,
    stats.water_temperature,
    containerStats.supply_liquid_temp,
    containerStats.water_temperature,
  )
  const supplyLiquidSetTemp = firstNumeric(
    stats.supply_liquid_set_temp,
    containerStats.supply_liquid_set_temp,
  )
  const supplyLiquidPressure = firstNumeric(
    stats.supply_liquid_pressure,
    containerStats.supply_liquid_pressure,
  )

  const tempVisual = {
    color: getAntspaceSupplyLiquidTemperatureColor(
      supplyLiquidTemp as number,
      status,
      data,
      containerSettings,
    ),
    flash: shouldAntspaceSupplyLiquidTempFlash(
      supplyLiquidTemp as number,
      status,
      data,
      containerSettings,
    ),
    superflash: shouldAntspaceSupplyLiquidTempSuperflash(
      supplyLiquidTemp as number,
      status,
      data,
      containerSettings,
    ),
  }

  const setTempVisual = {
    color: getAntspaceSupplyLiquidTemperatureColor(
      supplyLiquidSetTemp as number,
      status,
      data,
      containerSettings,
    ),
    flash: shouldAntspaceSupplyLiquidTempFlash(
      supplyLiquidSetTemp as number,
      status,
      data,
      containerSettings,
    ),
    superflash: shouldAntspaceSupplyLiquidTempSuperflash(
      supplyLiquidSetTemp as number,
      status,
      data,
      containerSettings,
    ),
  }

  const pressureVisual = {
    color: getAntspaceSupplyLiquidPressureColor(
      supplyLiquidPressure as number,
      status,
      data,
      containerSettings,
    ),
    flash: shouldAntspacePressureFlash(
      supplyLiquidPressure as number,
      status,
      data,
      containerSettings,
    ),
    superflash: shouldAntspacePressureSuperflash(
      supplyLiquidPressure as number,
      status,
      data,
      containerSettings,
    ),
  }

  return (
    <div className="mdk-supply-liquid-box">
      <div className="mdk-supply-liquid-box__stats">
        <SingleStatCard
          variant="secondary"
          name="Supply Liquid"
          subtitle="Temp"
          value={supplyLiquidTemp}
          unit={UNITS.TEMPERATURE_C}
          color={tempVisual.color}
          flash={tempVisual.flash}
          superflash={tempVisual.superflash}
        />
        <SingleStatCard
          variant="secondary"
          name="Supply Liquid"
          subtitle="Set Temp"
          value={supplyLiquidSetTemp}
          unit={UNITS.TEMPERATURE_C}
          color={setTempVisual.color}
          flash={setTempVisual.flash}
          superflash={setTempVisual.superflash}
        />
        <SingleStatCard
          variant="secondary"
          name="Supply Liquid"
          subtitle="Pressure"
          value={supplyLiquidPressure}
          unit={UNITS.PRESSURE_BAR}
          color={pressureVisual.color}
          flash={pressureVisual.flash}
          superflash={pressureVisual.superflash}
        />
      </div>
    </div>
  )
}
