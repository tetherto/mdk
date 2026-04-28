import * as React from 'react'

import { cn, EmptyState, Loader } from '@tetherto/mdk-core-ui'
import { CHART_EMPTY_DESCRIPTION } from '../../../constants/charts'
import { useChartDataCheck } from '../../../hooks'

type ChartWrapperProps = {
  /**
   * Chart content to render
   */
  children?: React.ReactNode

  /**
   * Chart data object (for LineChart with datasets)
   */
  data?: Record<string, unknown> | unknown[]

  /**
   * Chart dataset (for BarChart with direct dataset)
   */
  dataset?: Record<string, unknown> | unknown[]

  /**
   * Loading state
   * @default false
   */
  isLoading?: boolean

  /**
   * Custom loader component to show when loading (overrides default spinner)
   */
  customLoader?: React.ReactNode

  /**
   * Whether to show "no data" placeholder when data is empty
   * @default true
   */
  showNoDataPlaceholder?: boolean

  /**
   * Custom message or component to show when no data
   */
  customNoDataMessage?: string | React.ReactNode

  /**
   * Minimum height for the container (in pixels)
   */
  minHeight?: number

  /**
   * Minimum height for the loading skeleton (in pixels)
   * Falls back to minHeight if not provided
   */
  loadingMinHeight?: number

  /**
   * Custom className for the container
   */
  className?: string
}

/**
 * ChartWrapper - Wrapper component for charts with loading and empty states
 *
 * Handles three states:
 * - Loading: Shows skeleton loader
 * - No data: Shows empty state placeholder
 * - Has data: Shows chart content
 *
 * @example
 * ```tsx
 * <ChartWrapper
 *   data={chartData}
 *   isLoading={isLoading}
 *   minHeight={400}
 * >
 *   <LineChart data={chartData} />
 * </ChartWrapper>
 * ```
 *
 *  @example
 * ```tsx
 * <ChartWrapper
 *   data={chartData}
 *   isLoading={isLoading}
 *   minHeight={400}
 *   custom={<CustomLoader />}
 * >
 *   <LineChart data={chartData} />
 * </ChartWrapper>
 * ```
 *
 * @example
 * // With custom empty message
 * ```tsx
 * <ChartWrapper
 *   dataset={barData}
 *   isLoading={false}
 *   customNoDataMessage="No sales data available"
 *   minHeight={300}
 * >
 *   <BarChart data={barData} />
 * </ChartWrapper>
 * ```
 */
const ChartWrapper: React.FC<ChartWrapperProps> = ({
  children,
  data,
  dataset,
  isLoading = false,
  showNoDataPlaceholder = true,
  customLoader = <Loader />,
  customNoDataMessage,
  minHeight = 400,
  loadingMinHeight = minHeight,
  className,
}) => {
  // Check if chart has data
  const hasNoData = useChartDataCheck({ data, dataset })

  // Determine visibility states
  const isDataVisible = !(hasNoData || isLoading)

  // Get empty message
  const emptyMessage = React.useMemo(() => {
    if (typeof customNoDataMessage === 'string') {
      return customNoDataMessage
    }
    return customNoDataMessage || CHART_EMPTY_DESCRIPTION
  }, [customNoDataMessage])

  return (
    <div className={cn('mdk-chart-wrapper', className)}>
      {/* Chart Content */}
      <div
        className={cn(
          'mdk-chart-wrapper__content',
          !isDataVisible && 'mdk-chart-wrapper__content--hidden',
        )}
      >
        {children}
      </div>

      {/* Empty State */}
      {!isLoading && hasNoData && showNoDataPlaceholder && (
        <div
          className="mdk-chart-wrapper__empty"
          style={minHeight ? { minHeight: `${minHeight}px` } : undefined}
        >
          {typeof customNoDataMessage === 'string' || !customNoDataMessage ? (
            <EmptyState description={emptyMessage as string} />
          ) : (
            customNoDataMessage
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div
          className="mdk-chart-wrapper__loading"
          style={{ minHeight: `${loadingMinHeight || minHeight || 400}px` }}
        >
          {customLoader}
        </div>
      )}
    </div>
  )
}

ChartWrapper.displayName = 'ChartWrapper'

export { ChartWrapper }
