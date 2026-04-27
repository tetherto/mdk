import { cn } from '../../utils'

import type { ChartStatsFooterProps, MinMaxAvg } from './types'

type MinMaxAvgRowProps = { minMaxAvg: MinMaxAvg }

const MinMaxAvgRow = ({ minMaxAvg }: MinMaxAvgRowProps) => {
  const { min, max, avg } = minMaxAvg
  const items = [
    { label: 'Min', value: min },
    { label: 'Max', value: max },
    { label: 'Avg', value: avg },
  ].filter((item) => item.value !== undefined && item.value !== '')

  return (
    <>
      {items.map((item) => (
        <div key={item.label} className="mdk-chart-stats-footer__row">
          <div className="mdk-chart-stats-footer__primary-text">{item.label}</div>
          <div className="mdk-chart-stats-footer__secondary-text">
            {avg === '-' ? '-' : item.value}
          </div>
        </div>
      ))}
    </>
  )
}

/**
 * ChartStatsFooter - Displays Min/Max/Avg values and optional stats grid below a chart
 *
 * @example
 * ```tsx
 * <ChartStatsFooter
 *   minMaxAvg={{ min: '10 TH/s', max: '100 TH/s', avg: '55 TH/s' }}
 *   stats={[{ label: 'Uptime', value: '99.5%' }]}
 * />
 * ```
 */
export const ChartStatsFooter = ({
  minMaxAvg,
  stats,
  statsPerColumn = 1,
  secondaryLabel,
  className,
}: ChartStatsFooterProps) => {
  const hasMinMaxAvg = minMaxAvg && (minMaxAvg.min || minMaxAvg.max || minMaxAvg.avg)
  const hasStats = stats && stats.length > 0
  const hasSecondaryLabel = secondaryLabel && secondaryLabel.title

  if (!hasMinMaxAvg && !hasStats && !hasSecondaryLabel) return null

  const numColumns = hasStats ? Math.ceil(stats!.length / statsPerColumn) : 0

  return (
    <div
      className={cn(
        'mdk-chart-stats-footer',
        statsPerColumn > 1 && 'mdk-chart-stats-footer--multi-row',
        className,
      )}
    >
      {hasMinMaxAvg && (
        <div className="mdk-chart-stats-footer__min-max-avg">
          <MinMaxAvgRow minMaxAvg={minMaxAvg!} />
        </div>
      )}
      {hasStats && (
        <div
          className={cn(
            'mdk-chart-stats-footer__stats',
            statsPerColumn === 1 && 'mdk-chart-stats-footer__stats--full-width',
          )}
        >
          {Array.from({ length: numColumns }, (_, colIndex) => {
            const start = colIndex * statsPerColumn
            const colItems = stats!.slice(start, start + statsPerColumn)

            return (
              <div key={colIndex} className="mdk-chart-stats-footer__stats-col">
                {colItems.map((item) => (
                  <div
                    key={item.label}
                    className={cn(
                      'mdk-chart-stats-footer__stats-row',
                      statsPerColumn === 1 && 'mdk-chart-stats-footer__stats-row--full-width',
                    )}
                    style={{ flex: 1 / statsPerColumn }}
                  >
                    <div className="mdk-chart-stats-footer__stat-label">{item.label}</div>
                    <div className="mdk-chart-stats-footer__stat-value">{item.value}</div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
      {hasSecondaryLabel && (
        <div className="mdk-chart-stats-footer__row">
          <div className="mdk-chart-stats-footer__primary-text">{secondaryLabel!.title}</div>
          <div className="mdk-chart-stats-footer__secondary-text mdk-chart-stats-footer__secondary-label-value">
            {secondaryLabel!.value}
          </div>
        </div>
      )}
    </div>
  )
}

ChartStatsFooter.displayName = 'ChartStatsFooter'

export type {
  ChartStatsFooterItem,
  ChartStatsFooterProps,
  MinMaxAvg,
  SecondaryLabel,
} from './types'
