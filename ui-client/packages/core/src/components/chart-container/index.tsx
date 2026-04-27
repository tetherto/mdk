import * as React from 'react'

import { cn } from '../../utils'
import type { MinMaxAvg } from '../chart-stats-footer/types'
import { Loader } from '../loader'
import { RadioCard, RadioGroup } from '../radio'

function legendFillColor(color: string): string {
  if (color.startsWith('hsl')) {
    return color.replace(')', ' / 0.25)')
  }
  return `${color}40`
}

export type RangeSelectorOption = {
  label: string
  value: string
}

export type RangeSelectorProps = {
  options: RangeSelectorOption[]
  value: string
  onChange: (value: string) => void
  className?: string
  style?: React.CSSProperties
  buttonClassName?: string
}

export type HighlightedValueProps = {
  value: string | number
  unit?: string
  className?: string
  style?: React.CSSProperties
}

export type LegendItem = {
  label: string
  color: string
  hidden?: boolean
}

export type ChartContainerProps = {
  title?: string
  header?: React.ReactNode
  legendData?: LegendItem[]
  highlightedValue?: HighlightedValueProps
  rangeSelector?: RangeSelectorProps
  loading?: boolean
  empty?: boolean
  emptyMessage?: string
  minMaxAvg?: MinMaxAvg
  timeRange?: string
  footer?: React.ReactNode
  footerClassName?: string
  className?: string
  children: React.ReactNode
  onToggleDataset?: (index: number) => void
}

export const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  (
    {
      title,
      header,
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
    const toggleDataset = React.useCallback((index: number) => {
      onToggleDataset?.(index)
    }, [])

    const useGridLayout = (legendData && legendData.length > 0) || highlightedValue || rangeSelector
    const hasHeaderRow1 = header ?? title ?? (rangeSelector && rangeSelector.options.length > 0)
    const hasLegendRow = legendData && legendData.length > 0

    const isContentVisible = !empty && !loading
    const hasBuiltInFooter = (minMaxAvg || timeRange) && isContentVisible
    const hasFooter = (footer || hasBuiltInFooter) && isContentVisible

    const builtInFooter = hasBuiltInFooter ? (
      <div className="mdk-chart-container__stats">
        {minMaxAvg && (
          <>
            <span className="mdk-chart-container__stats-item">
              <span className="mdk-chart-container__stats-label">Min</span>
              <span className="mdk-chart-container__stats-value">{minMaxAvg.min}</span>
            </span>
            <span className="mdk-chart-container__stats-item">
              <span className="mdk-chart-container__stats-label">Avg</span>
              <span className="mdk-chart-container__stats-value">{minMaxAvg.avg}</span>
            </span>
            <span className="mdk-chart-container__stats-item">
              <span className="mdk-chart-container__stats-label">Max</span>
              <span className="mdk-chart-container__stats-value">{minMaxAvg.max}</span>
            </span>
          </>
        )}
      </div>
    ) : null

    return (
      <div
        ref={ref}
        className={cn(
          'mdk-chart-container',
          useGridLayout && 'mdk-chart-container--grid',
          className,
        )}
      >
        {useGridLayout ? (
          <>
            <div className="mdk-chart-container__title-area">
              {hasHeaderRow1 &&
                (header ?? (title && <h3 className="mdk-chart-container__title">{title}</h3>))}
            </div>
            <div className="mdk-chart-container__range-area">
              {rangeSelector && rangeSelector.options.length > 0 && (
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
              )}
            </div>
            <div className="mdk-chart-container__legend-area">
              {hasLegendRow && isContentVisible && (
                <div className="mdk-chart-container__legend">
                  {legendData!.map((item, i) => {
                    const isHidden = item.hidden
                    return (
                      <button
                        key={i}
                        type="button"
                        className="mdk-chart-container__legend-item"
                        style={{ opacity: isHidden ? 0.3 : 1 }}
                        onClick={() => toggleDataset(i)}
                      >
                        <span
                          className="mdk-chart-container__legend-box"
                          style={{
                            backgroundColor: legendFillColor(item.color),
                            borderColor: item.color,
                          }}
                        />
                        <span className="mdk-chart-container__legend-label">{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            {highlightedValue && isContentVisible && (
              <div className="mdk-chart-container__highlight-area">
                <div
                  className={cn(
                    'mdk-chart-container__highlighted-value',
                    highlightedValue.className,
                  )}
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
            )}
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
          </>
        ) : (
          <>
            {hasHeaderRow1 && (
              <div className="mdk-chart-container__header-row">
                <div className="mdk-chart-container__header-left">
                  {header ?? (title && <h3 className="mdk-chart-container__title">{title}</h3>)}
                </div>
              </div>
            )}
            <div className="mdk-chart-container__body">
              {loading && (
                <div className="mdk-chart-container__loading-overlay">
                  <Loader />
                </div>
              )}
              {empty && !loading && (
                <div className="mdk-chart-container__empty">{emptyMessage}</div>
              )}
              {!empty && children}
            </div>
          </>
        )}
        {hasFooter && (
          <div className={cn('mdk-chart-container__footer-area', footerClassName)}>
            {builtInFooter}
            {footer}
          </div>
        )}
      </div>
    )
  },
)

ChartContainer.displayName = 'ChartContainer'
