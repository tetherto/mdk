import { Indicator, UNITS } from '@mdk/core'
import type { ReactElement } from 'react'
import type { Device } from '../../../../types/device'
import { DEVICE_STATUS } from '../../../../constants/devices'
import { getContainerSpecificStats, getStats } from '../../../../utils/device-utils'
import { SingleStatCard } from '../../explorer/details-view/single-stat-card/single-stat-card'
import {
  getImmersionTemperatureColor,
  shouldImmersionTemperatureFlash,
} from '../../explorer/containers/bitmain-immersion/bitmain-immersion-utils'
import { getPumpStatus, pumpStatusToIndicatorColor } from './bitmain-immersion-summary-box.utils'
import './bitmain-immersion-summary-box.scss'

export type BitMainImmersionSummaryBoxContainerSettings = {
  thresholds?: Record<string, unknown>
}

export type BitMainImmersionSummaryBoxProps = {
  data?: Device
  containerSettings?: BitMainImmersionSummaryBoxContainerSettings | null
}

type BitmainImmersionContainerSpecific = {
  second_supply_temp1?: number
  second_supply_temp2?: number
  primary_supply_temp?: number
  second_pump2?: boolean
  second_pump1?: boolean
  second_pump1_fault?: boolean
  second_pump2_fault?: boolean
  one_pump?: boolean
}

export const BitMainImmersionSummaryBox = ({
  data,
  containerSettings = null,
}: BitMainImmersionSummaryBoxProps): ReactElement | null => {
  if (!data) {
    return null
  }

  const cs = getContainerSpecificStats(data) as BitmainImmersionContainerSpecific
  const {
    second_supply_temp1,
    second_supply_temp2,
    primary_supply_temp,
    second_pump2,
    second_pump1,
    second_pump1_fault,
    second_pump2_fault,
    one_pump,
  } = cs

  const stats = getStats(data)
  const status = String(stats.status ?? data.status ?? '')

  const liqSupply = {
    color: getImmersionTemperatureColor(primary_supply_temp, status, containerSettings),
    flash: shouldImmersionTemperatureFlash(primary_supply_temp, status, containerSettings),
  }
  const liqTemp1 = {
    color: getImmersionTemperatureColor(second_supply_temp1, status, containerSettings),
    flash: shouldImmersionTemperatureFlash(second_supply_temp1, status, containerSettings),
  }
  const liqTemp2 = {
    color: getImmersionTemperatureColor(second_supply_temp2, status, containerSettings),
    flash: shouldImmersionTemperatureFlash(second_supply_temp2, status, containerSettings),
  }

  const oilPump1Status = getPumpStatus(second_pump1_fault, second_pump1)
  const oilPump2Status = getPumpStatus(second_pump2_fault, second_pump2)
  const waterPumpStatus = one_pump ? DEVICE_STATUS.RUNNING : DEVICE_STATUS.OFF

  return (
    <div className="mdk-bitmain-immersion-summary-box">
      <div className="mdk-bitmain-immersion-summary-box__pumps">
        <div className="mdk-bitmain-immersion-summary-box__pump">
          <span className="mdk-bitmain-immersion-summary-box__pump-title">Oil Pump #1</span>
          <Indicator color={pumpStatusToIndicatorColor(oilPump1Status)} size="md">
            {oilPump1Status}
          </Indicator>
        </div>
        <div className="mdk-bitmain-immersion-summary-box__pump">
          <span className="mdk-bitmain-immersion-summary-box__pump-title">Oil Pump #2</span>
          <Indicator color={pumpStatusToIndicatorColor(oilPump2Status)} size="md">
            {oilPump2Status}
          </Indicator>
        </div>
        <div className="mdk-bitmain-immersion-summary-box__pump">
          <span className="mdk-bitmain-immersion-summary-box__pump-title">Water pump</span>
          <Indicator color={pumpStatusToIndicatorColor(waterPumpStatus)} size="md">
            {waterPumpStatus}
          </Indicator>
        </div>
      </div>

      <div className="mdk-bitmain-immersion-summary-box__liquid-stats">
        <SingleStatCard
          variant="secondary"
          name="Liquid supply Temp"
          value={primary_supply_temp}
          unit={UNITS.TEMPERATURE_C}
          color={liqSupply.color}
          flash={liqSupply.flash}
        />
        <SingleStatCard
          variant="secondary"
          name="Sec. Liquid"
          subtitle="Supply Temp1"
          value={second_supply_temp1}
          unit={UNITS.TEMPERATURE_C}
          color={liqTemp1.color}
          flash={liqTemp1.flash}
        />
        <SingleStatCard
          variant="secondary"
          name="Sec. Liquid"
          subtitle="Supply Temp2"
          value={second_supply_temp2}
          unit={UNITS.TEMPERATURE_C}
          color={liqTemp2.color}
          flash={liqTemp2.flash}
        />
      </div>
    </div>
  )
}
