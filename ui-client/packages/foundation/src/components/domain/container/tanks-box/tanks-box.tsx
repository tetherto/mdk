import _map from 'lodash/map'
import { UNITS } from '@tetherto/mdk-core-ui'
import { TankRow } from './tank-row'
import './tanks-box.scss'

export type Tank = {
  cold_temp_c: number
  enabled: boolean
  color?: string
  flash?: boolean
  tooltip?: string
}

export type TanksBoxPressure = {
  value?: number
  flash?: boolean
  color?: string
  tooltip?: string
}

export type WaterPump = {
  enabled: boolean
}

export type TanksBoxProps = {
  data?: {
    oil_pump: Tank[]
    water_pump: WaterPump[]
    pressure: TanksBoxPressure[]
  }
}

/**
 * TanksBox Component
 *
 * Displays tank rows with temperature, pressure, and oil/water pump status.
 *
 * @example
 * ```tsx
 * <TanksBox
 *   data={{
 *     oil_pump: [{ cold_temp_c: 45, enabled: true }, ...],
 *     water_pump: [{ enabled: true }, ...],
 *     pressure: [{ value: 1.2 }, ...],
 *   }}
 * />
 * ```
 */
export const TanksBox = ({ data }: TanksBoxProps): JSX.Element | null => {
  if (!data) {
    return null
  }

  return (
    <div className="mdk-tanks-box">
      {_map(data.oil_pump, (pump, index) => (
        <TankRow
          key={`tank-${index}`}
          label={`Tank ${index + 1}`}
          temperature={pump.cold_temp_c}
          unit={UNITS.TEMPERATURE_C}
          oilPumpEnabled={pump.enabled}
          waterPumpEnabled={data.water_pump[index]?.enabled ?? false}
          pressure={data.pressure[index] ?? {}}
          color={pump.color || ''}
          flash={pump.flash}
          tooltip={pump.tooltip}
        />
      ))}
    </div>
  )
}
