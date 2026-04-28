import { cn, CoreAlert, formatNumber, Indicator, SimpleTooltip, Spinner } from '@tetherto/core'
import {
  MINERS_ACTIVITY_ITEMS,
  MINERS_ACTIVITY_LABELS,
  MINERS_ACTIVITY_TOOLTIPS,
  MinersActivityIndicatorColors,
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

type MinersActivityChartProps = {
  data: MinersActivityData
  large: boolean
  isLoading: boolean
  isError: boolean
  error: MinerActivityChartErrorProp | null
  showLabel: boolean
  isDemoMode: boolean
}

export const MinersActivityChart = ({
  data = {},
  large = false,
  isLoading = false,
  isError = false,
  error = null,
  showLabel = true,
  isDemoMode = false,
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

  return (
    <>
      <div className="mdk-miners-activity-chart__root">
        {items.map((value) => {
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
                  {MINERS_ACTIVITY_LABELS[value as keyof typeof MINERS_ACTIVITY_LABELS] || value}
                </span>
              )}
              <span>{formatNumber((displayData[value] as number | undefined) || 0)}</span>
            </Indicator>
          )

          const tooltip = MINERS_ACTIVITY_TOOLTIPS[value as keyof typeof MINERS_ACTIVITY_TOOLTIPS]

          if (tooltip) {
            return (
              <SimpleTooltip key={value} content={tooltip} side="top">
                {itemNode}
              </SimpleTooltip>
            )
          }

          return itemNode
        })}
      </div>
    </>
  )
}
