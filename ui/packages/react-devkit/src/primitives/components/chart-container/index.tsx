import { type CSSProperties, forwardRef, type ReactNode, useCallback } from 'react'
import { getChartLegendItemStyles } from '../../utils/chart-options'
import { cn } from '../../utils'
import { MinMaxAvg } from '../min-max-avg'
import type { MinMaxAvgValues } from '../min-max-avg/types'
import { Loader } from '../loader'
import { RadioCard, RadioGroup } from '../radio'

export type RangeSelectorOption = {
  label: string
  value: string
}

export type RangeSelectorProps = {
  options: RangeSelectorOption[]
  value: string
  onChange: (value: string) => void
  className?: string
  style?: CSSProperties
  buttonClassName?: string
}

export type HighlightedValueProps = {
  value: string | number
  unit?: string
  className?: string
  style?: CSSProperties
}

export type LegendItem = {
  label: string
  color: string
  hidden?: boolean
}

export type ChartContainerProps = {
  title?: string
  /**
   * Optional node rendered immediately after the title text (e.g. an info
   * tooltip). Only shown when `title` is set and `header` is not. Additive -
   * omit it and the title renders exactly as before.
   */
  titleExtra?: ReactNode
  header?: ReactNode
  /**
   * Optional action rendered on the right side of the header row (e.g. an
   * expand/fullscreen toggle). Sits alongside the range selector when both are
   * present. Purely additive - omit it and the header renders exactly as before.
   */
  headerAction?: ReactNode
  legendData?: LegendItem[]
  highlightedValue?: HighlightedValueProps
  rangeSelector?: RangeSelectorProps
  loading?: boolean
  empty?: boolean
  emptyMessage?: string
  minMaxAvg?: MinMaxAvgValues
  timeRange?: string
  footer?: ReactNode
  footerClassName?: string
  className?: string
  children: ReactNode
  onToggleDataset?: (index: number) => void
}

/**
 * Standard chrome for charts: title, optional highlighted value, legend with
 * toggle, range selector (radio cards), loading / empty states, and a footer
 * for min/max/avg stats.
 *
 * @category charts
 *
 * @example
 * ```tsx
 * <ChartContainer
 *   title="Hashrate"
 *   highlightedValue={{ value: 102.4, unit: 'TH/s' }}
 *   rangeSelector={{ options, value, onChange }}
 *   loading={isLoading}
 *   empty={!hasData}
 * >
 *   <LineChart data={data} />
 * </ChartContainer>
 * ```
 * @domain generic
 * @tier agent-ready
 */
export const ChartContainer = forwardRef<HTMLDivElement, ChartContainerProps>(
  (
    {
      title,
      titleExtra,
      header,
      headerAction,
      legendData,
      highlightedValue,
      rangeSelector,
      loading,
      empty,
      emptyMessage = 'No data available',
      minMaxAvg,
      timeRange,
      footer,
      footerClassName,
      className,
      children,
      onToggleDataset,
    },
    ref,
  ) => {
    const toggleDataset = useCallback(
      (index: number) => {
        onToggleDataset?.(index)
      },
      [onToggleDataset],
    )

    const hasRangeSelector = !!(rangeSelector && rangeSelector.options.length > 0)
    const hasHeaderRight = hasRangeSelector || !!headerAction
    const hasHeaderRow1 = header ?? title ?? hasHeaderRight
    const hasLegendRow = legendData && legendData.length > 0

    const isContentVisible = !empty && !loading
    const hasBuiltInFooter = (minMaxAvg || timeRange) && isContentVisible
    const hasMinMaxAvgContent =
      minMaxAvg && (minMaxAvg.min || minMaxAvg.max || minMaxAvg.avg)
    const useCombinedPanel = hasLegendRow && hasMinMaxAvgContent && isContentVisible
    const hasFooter = (footer || hasBuiltInFooter) && isContentVisible

    const builtInFooter = hasBuiltInFooter ? (
      <>
        {minMaxAvg && <MinMaxAvg {...minMaxAvg} />}
        {timeRange && <span className="mdk-chart-container__time-range">{timeRange}</span>}
      </>
    ) : null

    const legend = hasLegendRow && isContentVisible && (
      <div className="mdk-chart-container__legend">
        {legendData!.map((item, i) => {
          const isHidden = item.hidden
          const swatch = getChartLegendItemStyles(item.color, isHidden)
          return (
            <button
              key={i}
              type="button"
              className="mdk-chart-container__legend-item"
              onClick={() => toggleDataset(i)}
            >
              <span
                className="mdk-chart-container__legend-box"
                style={{
                  backgroundColor: swatch.fill,
                  borderColor: swatch.stroke,
                }}
              />
              <span
                className="mdk-chart-container__legend-label"
                style={{ color: swatch.labelColor }}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    )

    const highlightedValueBlock = highlightedValue && isContentVisible && (
      <div className="mdk-chart-container__highlight-area">
        <div
          className={cn('mdk-chart-container__highlighted-value', highlightedValue.className)}
          style={highlightedValue.style}
        >
          <span className="mdk-chart-container__highlighted-value__number">
            {highlightedValue.value}
          </span>
          {highlightedValue.unit && (
            <span className="mdk-chart-container__highlighted-value__unit">
              {highlightedValue.unit}
            </span>
          )}
        </div>
      </div>
    )

    const chartArea = (
      <div className="mdk-chart-container__chart-area">
        {loading && (
          <div className="mdk-chart-container__loading-overlay">
            <Loader />
          </div>
        )}
        {empty && !loading && (
          <div className="mdk-chart-container__empty">{emptyMessage}</div>
        )}
        {isContentVisible && children}
      </div>
    )

    const footerArea = hasFooter && (
      <div className={cn('mdk-chart-container__footer-area', footerClassName)}>
        {builtInFooter}
        {footer}
      </div>
    )

    const rangeSelectorBlock = rangeSelector && rangeSelector.options.length > 0 && (
      <div role="group" aria-label="Time range">
        <RadioGroup defaultValue={rangeSelector.value} orientation="horizontal" noGap>
          {rangeSelector.options.map(({ value, label }) => (
            <RadioCard
              value={value}
              label={label}
              key={value}
              aria-pressed={rangeSelector.value === value}
              onClick={() => rangeSelector.onChange(value)}
            />
          ))}
        </RadioGroup>
      </div>
    )

    const legendHighlightRow = (legend || highlightedValueBlock) && (
      <div className="mdk-chart-container__panel-header">
        {legend && <div className="mdk-chart-container__legend-area">{legend}</div>}
        {highlightedValueBlock}
      </div>
    )

    return (
      <div
        ref={ref}
        className={cn(
          'mdk-chart-container',
          useCombinedPanel && 'mdk-chart-container--combined-panel',
          className,
        )}
      >
        {hasHeaderRow1 && (
          <div className="mdk-chart-container__header-row">
            <div className="mdk-chart-container__header-left">
              {header ??
                (title && (
                  <h3 className="mdk-chart-container__title">
                    {title}
                    {titleExtra}
                  </h3>
                ))}
            </div>
            {hasHeaderRight && (
              <div className="mdk-chart-container__header-right">
                {rangeSelectorBlock}
                {headerAction}
              </div>
            )}
          </div>
        )}
        {useCombinedPanel ? (
          <div className="mdk-chart-container__panel">
            {legendHighlightRow}
            {chartArea}
            {footerArea}
          </div>
        ) : (
          <>
            {legendHighlightRow}
            {chartArea}
            {footerArea}
          </>
        )}
      </div>
    )
  },
)

ChartContainer.displayName = 'ChartContainer'
