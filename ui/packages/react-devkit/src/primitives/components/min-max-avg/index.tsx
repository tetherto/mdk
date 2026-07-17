import { cn } from '../../utils'

import type { MinMaxAvgProps } from './types'

const ITEMS = [
  { key: 'min' as const, label: 'Min' },
  { key: 'max' as const, label: 'Max' },
  { key: 'avg' as const, label: 'Avg' },
]

/**
 * Min / Max / Avg summary row with consistent MDK label and value styling.
 *
 * @example
 * ```tsx
 * <MinMaxAvg min="10 TH/s" max="100 TH/s" avg="55 TH/s" />
 * ```
 *
 * @category charts
 * @domain generic
 * @tier agent-ready
 */
export const MinMaxAvg = ({ min, max, avg, className }: MinMaxAvgProps) => {
  const values = { min, max, avg }
  const visible = ITEMS.filter(({ key }) => {
    const value = values[key]
    return value !== undefined && value !== ''
  })

  if (visible.length === 0) return null

  return (
    <div className={cn('mdk-min-max-avg', className)} role="group" aria-label="Chart statistics">
      {visible.map(({ key, label }) => (
        <span key={key} className="mdk-min-max-avg__item">
          <span className="mdk-min-max-avg__label">{label}</span>
          <span className="mdk-min-max-avg__value">{values[key]}</span>
        </span>
      ))}
    </div>
  )
}

MinMaxAvg.displayName = 'MinMaxAvg'

export type { MinMaxAvgProps } from './types'
