import type { ReactElement } from 'react'
import './miners-summary-box.scss'

export type MinersSummaryParam = {
  /** Parameter label */
  label: string
  /** Pre-formatted display value (including units) */
  value: string
}

export type MinersSummaryBoxProps = {
  /** Array of label-value pairs to display in a 2-column grid */
  params: MinersSummaryParam[]
  /** Additional CSS class name */
  className?: string
}

const VALUE_SIZE_THRESHOLD = {
  SMALL: 12,
  TINY: 15,
}

const getLabelSizeClass = (valueLength: number): string => {
  if (valueLength > VALUE_SIZE_THRESHOLD.TINY) return 'mdk-miners-summary-box__label--tiny'
  if (valueLength > VALUE_SIZE_THRESHOLD.SMALL) return 'mdk-miners-summary-box__label--small'
  return ''
}

/**
 * Miners Summary Box Component
 *
 * Displays mining summary parameters in a 2-column grid layout.
 * Accepts pre-formatted values - consumers handle data formatting.
 *
 * @example
 * ```tsx
 * <MinersSummaryBox
 *   params={[
 *     { label: 'Efficiency', value: '32.5 W/TH/S' },
 *     { label: 'Hash Rate', value: '1.24 PH/s' },
 *     { label: 'Max Temp', value: '72 °C' },
 *     { label: 'Avg Temp', value: '65 °C' },
 *   ]}
 * />
 * ```
 */
export const MinersSummaryBox = ({ params, className }: MinersSummaryBoxProps): ReactElement => {
  return (
    <div className={`mdk-miners-summary-box ${className || ''}`.trim()}>
      {params.map((param) => {
        const labelSizeClass = getLabelSizeClass(param.value.length)

        return (
          <div key={param.label} className="mdk-miners-summary-box__param">
            <span className={`mdk-miners-summary-box__label ${labelSizeClass}`.trim()}>
              {param.label}
            </span>
            &nbsp;
            <span className="mdk-miners-summary-box__value">{param.value}</span>
          </div>
        )
      })}
    </div>
  )
}
