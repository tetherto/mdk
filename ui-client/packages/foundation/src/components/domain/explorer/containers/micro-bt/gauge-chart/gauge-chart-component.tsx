import { COLOR, GaugeChart } from '@tetherto/mdk-core-ui'
import type { ReactElement } from 'react'
import './gauge-chart-component.scss'

type GaugeChartComponentProps = {
  /** Maximum value for the gauge */
  max: number
  /** Current value */
  value: number
  /** Label/title for the chart */
  label?: string
  /** Unit of measurement */
  unit: string
  /** Custom chart style */
  chartStyle?: React.CSSProperties
  /** Arc colors in HEX format */
  colors?: string[]
  /** Hide the percentage text inside the chart */
  hideText?: boolean
  /** Chart height in pixels */
  height?: number
  /** Custom className */
  className?: string
}

/**
 * Gauge Chart Component
 *
 * Displays a value as a gauge/speedometer chart with label and unit.
 *
 * @example
 * ```tsx
 * <GaugeChartComponent
 *   max={100}
 *   value={75.5}
 *   label="Temperature"
 *   unit="°C"
 * />
 * ```
 */
export const GaugeChartComponent = ({
  max,
  value,
  label = '',
  unit,
  chartStyle = {},
  colors = [COLOR.EMERALD, COLOR.SOFT_TEAL],
  hideText = true,
  height = 200,
  className,
}: GaugeChartComponentProps): ReactElement => {
  const percentage = Math.min(Math.max(value / max, 0), 1)

  return (
    <div className={`mdk-gauge-chart-component ${className || ''}`}>
      {label && <h3 className="mdk-gauge-chart-component__title">{label}</h3>}

      <div className="mdk-gauge-chart-component__chart" style={chartStyle}>
        <GaugeChart percent={percentage} colors={colors} hideText={hideText} height={height} />
      </div>

      {hideText && (
        <div className="mdk-gauge-chart-component__value">
          <span className="mdk-gauge-chart-component__value-number">{value}</span>
          <span className="mdk-gauge-chart-component__value-unit">{unit}</span>
        </div>
      )}
    </div>
  )
}
