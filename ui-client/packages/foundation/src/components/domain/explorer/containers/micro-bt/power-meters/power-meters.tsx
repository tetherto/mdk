import { UNITS } from '@tetherto/core'
import type { ReactElement } from 'react'
import type { Device } from '../../../../../../types'
import { getContainerSpecificStats } from '../../../../../../utils/device-utils'
import { ContentBox } from '../../../../container/content-box/content-box'
import type { DataRowItem } from '../../../../container/data-row/data-row'
import { GenericDataBox } from '../../../../container/generic-data-box/generic-data-box'
import './power-meters.scss'

type PowerMetersProps = {
  /** Device data */
  data?: Device
}

type PowerMeterData = {
  status?: number
  voltage_ab?: number
  voltage_bc?: number
  voltage_ca?: number
  total_power_factor?: number
  freq?: number
  total_active_power?: number
  total_apparent_power?: number
  total_active_energy?: number
}

/**
 * Power Meters Component
 *
 * Displays power meter readings for container devices including:
 * - Communication status
 * - Voltage measurements (A-B, B-C, C-A)
 * - Power factor and frequency
 * - Active and apparent power
 * - Energy consumption
 *
 * @example
 * ```tsx
 * <PowerMeters data={deviceData} />
 * ```
 */
export const PowerMeters = ({ data }: PowerMetersProps): ReactElement | null => {
  if (!data) return null

  const powerMeters = getContainerSpecificStats(data)?.power_meters as PowerMeterData[]

  if (!powerMeters || powerMeters.length === 0) {
    return null
  }

  return (
    <div className="mdk-power-meters">
      {powerMeters.map((powerMeter, index) => {
        const meterData: DataRowItem[] = [
          {
            label: 'Communication Status',
            value: powerMeter?.status === 1 ? 'Normal' : 'Error',
            color: powerMeter?.status === 1 ? 'green' : 'red',
          },
          {
            label: 'Voltage A-B',
            value: powerMeter?.voltage_ab,
            units: UNITS.VOLTAGE_V,
          },
          {
            label: 'Voltage B-C',
            value: powerMeter?.voltage_bc,
            units: UNITS.VOLTAGE_V,
          },
          {
            label: 'Voltage C-A',
            value: powerMeter?.voltage_ca,
            units: UNITS.VOLTAGE_V,
          },
          {
            label: 'Total Power Factor',
            value: powerMeter?.total_power_factor,
          },
          {
            label: 'Frequency',
            value: powerMeter?.freq,
            units: UNITS.FREQUENCY_HERTZ,
          },
          {
            label: 'Total Active Power',
            value: powerMeter?.total_active_power,
            units: UNITS.POWER_KW,
          },
          {
            label: 'Total Apparent Power',
            value: powerMeter?.total_apparent_power,
            units: UNITS.APPARENT_POWER_KVA,
          },
          {
            label: 'Total Active Energy',
            value: powerMeter?.total_active_energy,
            units: UNITS.ENERGY_KWH,
          },
        ]

        return (
          <div key={index} className="mdk-power-meters__panel">
            <ContentBox title={`Power Meter ${index + 1}`}>
              <GenericDataBox data={meterData} />
            </ContentBox>
          </div>
        )
      })}
    </div>
  )
}
