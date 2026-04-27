import { cn } from '../../utils'
import { formatNumber } from '../../utils/format'
import { hexToOpacity } from '../../utils/chart'

import type { DetailLegendItem, DetailLegendProps } from './types'

const ARROW_UP = '\u25B2'
const ARROW_DOWN = '\u25BC'

type PercentChangeIndicatorProps = { value: number }

const PercentChangeIndicator = ({ value }: PercentChangeIndicatorProps) => {
  const isPositive = value > 0
  const arrow = isPositive ? ARROW_UP : ARROW_DOWN

  return (
    <span
      className={cn(
        'mdk-detail-legend__percent-change',
        isPositive
          ? 'mdk-detail-legend__percent-change--positive'
          : 'mdk-detail-legend__percent-change--negative',
      )}
    >
      {arrow} {formatNumber(Math.abs(value))}%
    </span>
  )
}

type DefaultColorBoxProps = { color: string }

const DefaultColorBox = ({ color }: DefaultColorBoxProps) => (
  <div
    className="mdk-detail-legend__color-box"
    style={{
      border: `1px solid ${color}`,
      backgroundColor: hexToOpacity(color),
    }}
  />
)

/**
 * DetailLegend - Enhanced chart legend with current values and percentage change indicators
 *
 * @example
 * ```tsx
 * <DetailLegend
 *   items={[
 *     {
 *       label: 'Hashrate',
 *       color: '#59E8E8',
 *       currentValue: { value: 3590, unit: 'TH/s' },
 *       percentChange: 2.5,
 *     },
 *   ]}
 *   onToggle={(label) => handleToggle(label)}
 * />
 * ```
 */
export const DetailLegend = ({ items, onToggle, className }: DetailLegendProps) => {
  if (!items || items.length === 0) return null

  return (
    <div className={cn('mdk-detail-legend', className)}>
      {items.map((item: DetailLegendItem, index: number) => (
        <button
          key={`${item.label}-${index}`}
          type="button"
          className={cn(
            'mdk-detail-legend__item',
            item.hidden && 'mdk-detail-legend__item--hidden',
          )}
          onClick={() => onToggle?.(item.label, index)}
        >
          <div className="mdk-detail-legend__icon" style={{ color: item.color }}>
            {item.icon ?? <DefaultColorBox color={item.color} />}
          </div>
          <div className="mdk-detail-legend__content">
            <div className="mdk-detail-legend__label">{item.label}</div>
            {item.currentValue && (
              <div className="mdk-detail-legend__value-row">
                <span className="mdk-detail-legend__value">
                  {typeof item.currentValue.value === 'number'
                    ? formatNumber(item.currentValue.value)
                    : item.currentValue.value}
                </span>
                {item.currentValue.unit && (
                  <span className="mdk-detail-legend__unit">{item.currentValue.unit}</span>
                )}
                {item.percentChange != null && item.percentChange !== 0 && (
                  <PercentChangeIndicator value={item.percentChange} />
                )}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}

DetailLegend.displayName = 'DetailLegend'

export type { DetailLegendItem, DetailLegendProps } from './types'
