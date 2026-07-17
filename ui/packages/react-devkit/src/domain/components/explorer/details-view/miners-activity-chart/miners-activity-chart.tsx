import { cn, COLOR, CoreAlert, formatNumber, hexToRgba, Indicator, SimpleTooltip, Spinner } from '@primitives'
import type { JSX } from 'react'
import {
  MINERS_ACTIVITY_ITEMS,
  MINERS_ACTIVITY_LABELS,
  MINERS_ACTIVITY_TOOLTIPS,
  MinersActivityIndicatorColors,
  MinersActivityTileColors,
} from './miners-activity-chart.const'
import './miners-activity-chart.scss'

type MinersActivityData = {
  total?: number
  [key: string]: number | undefined
}

type MinerActivityChartErrorProp = {
  data?: { message?: string }
  [key: string]: unknown | null
}

/** Visual style for the per-status items. */
export type MinersActivityVariant = 'indicators' | 'tiles'

type MinersActivityChartProps = {
  data: MinersActivityData
  large: boolean
  isLoading: boolean
  isError: boolean
  error: MinerActivityChartErrorProp | null
  showLabel: boolean
  isDemoMode: boolean
  /** `indicators` (default) renders coloured dots; `tiles` renders tinted status tiles. */
  variant: MinersActivityVariant
}

const TILE_BACKGROUND_ALPHA = 0.12

/** Status colour for a tile (plain `#RRGGBB`); unknown statuses fall back to grey. */
const tileColor = (status: string): string =>
  MinersActivityTileColors[status as keyof typeof MinersActivityTileColors] ?? COLOR.GREY

/**
 * Per-status miner counts (online / offline / faulted / power-mode). Renders as
 * coloured indicator dots (`indicators`) or tinted status tiles (`tiles`).
 *
 * @category widgets
 * @domain device-management
 * @kernelCapability device-management
 * @tier agent-ready
 */
export const MinersActivityChart = ({
  data = {},
  large = false,
  isLoading = false,
  isError = false,
  error = null,
  showLabel = true,
  isDemoMode = false,
  variant = 'indicators',
}: Partial<MinersActivityChartProps>) => {
  const itemsRoot = MINERS_ACTIVITY_ITEMS.EXTENDED
  const items = itemsRoot.WOUT_MAINTENANCE

  const displayData = isError && isDemoMode ? {} : data

  if (isError && !isDemoMode) {
    return (
      <CoreAlert
        type="error"
        title="Failed to load miner activity data"
        description={error?.data?.message || 'Please try refreshing the page'}
        showIcon
      />
    )
  }

  if (isLoading) {
    return (
      <Spinner
        type="circle"
        className={cn(
          'mdk-miners-activity-chart__spinner',
          large && 'mdk-miners-activity-chart__spinner--large',
        )}
      />
    )
  }

  const withTooltip = (value: string, node: JSX.Element): JSX.Element => {
    const tooltip = MINERS_ACTIVITY_TOOLTIPS[value as keyof typeof MINERS_ACTIVITY_TOOLTIPS]
    if (!tooltip) return node
    return (
      <SimpleTooltip key={value} content={tooltip} side="top">
        {node}
      </SimpleTooltip>
    )
  }

  const label = (value: string): string =>
    MINERS_ACTIVITY_LABELS[value as keyof typeof MINERS_ACTIVITY_LABELS] || value
  const count = (value: string): string =>
    formatNumber((displayData[value] as number | undefined) || 0)

  return (
    <div className={cn('mdk-miners-activity-chart__root', variant === 'tiles' && 'mdk-miners-activity-chart__root--tiles')}>
      {items.map((value) => {
        if (variant === 'tiles') {
          const color = tileColor(value)
          const tile = (
            <div
              key={value}
              className={cn(
                'mdk-miners-activity-chart__tile',
                large && 'mdk-miners-activity-chart__tile--large',
              )}
              style={{ color, backgroundColor: hexToRgba(color, TILE_BACKGROUND_ALPHA) }}
            >
              {showLabel && <span className="mdk-miners-activity-chart__tile-label">{label(value)}</span>}
              <span className="mdk-miners-activity-chart__tile-value">{count(value)}</span>
            </div>
          )
          return withTooltip(value, tile)
        }

        const indicatorColor =
          MinersActivityIndicatorColors[value as keyof typeof MinersActivityIndicatorColors]
        const itemNode = (
          <Indicator
            key={value}
            color={indicatorColor}
            size={large ? 'lg' : 'sm'}
            vertical
            className={cn(
              'mdk-miners-activity-chart__item',
              large && 'mdk-miners-activity-chart__item--large',
            )}
          >
            {showLabel && (
              <span
                className={cn(
                  'mdk-miners-activity-chart__label',
                  large && 'mdk-miners-activity-chart__label--large',
                )}
              >
                {label(value)}
              </span>
            )}
            <span>{count(value)}</span>
          </Indicator>
        )
        return withTooltip(value, itemNode)
      })}
    </div>
  )
}
