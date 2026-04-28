import { EmptyState, Spinner } from '@tetherto/mdk-core-ui'
import _replace from 'lodash/replace'
import { useState } from 'react'
import type { ReactElement } from 'react'

import {
  isAntspaceHydro,
  isAntspaceImmersion,
  isBitdeer,
  isMicroBT,
} from '../../../../utils/container-utils'
import { LineChartCard } from '../../line-chart-card'
import type { LineChartCardData } from '../../line-chart-card/types'

import { CONTAINER_CHART_TIMELINE_OPTIONS } from './container-charts.constants'
import { getOverviewChartOilAdapter } from './container-charts.oil.adapter'
import { getOverviewChartPressureAdapter } from './container-charts.pressure.adapter'
import { overviewChartResultToLineChartCardData } from './container-charts.mappers'
import { getOverviewChartTempAdapter } from './container-charts.temp.adapter'
import type { ChartEntry } from './container-charts.types'

import './container-charts.scss'

export type ContainerChartCombinationOption = {
  value: string
  label: string
}

export type ContainerChartsDatasetBorderColorResolver = (args: {
  chartTitle: string
  datasetLabel: string
  datasetIndex: number
}) => string | undefined

const applyDatasetBorderColors = (
  chartTitle: string,
  data: LineChartCardData,
  resolve?: ContainerChartsDatasetBorderColorResolver,
): LineChartCardData => {
  if (!resolve) return data
  return {
    ...data,
    datasets: data.datasets.map((ds, datasetIndex) => {
      const borderColor = resolve({
        chartTitle,
        datasetLabel: ds.label ?? '',
        datasetIndex,
      })
      if (!borderColor) return ds
      return { ...ds, borderColor }
    }),
  }
}

export type ContainerChartsProps = {
  /** When false, shows an empty state (feature gate). @default true */
  featureEnabled?: boolean
  /** Message when `featureEnabled` is false */
  disabledMessage?: string
  /** Options for the combination selector */
  combinations: ContainerChartCombinationOption[]
  /** Loading state for combination options */
  isLoadingCombinations?: boolean
  /** Section heading */
  title?: string
  /** Controlled selected combination value */
  selectedCombination?: string | null
  /** Initial selection when uncontrolled */
  defaultSelectedCombination?: string | null
  onSelectedCombinationChange?: (value: string | null) => void
  /** Raw overview stats rows passed to chart adapters */
  chartRawData?: ChartEntry[] | null
  isLoadingCharts?: boolean
  /** Optional per-dataset line colors after adapters run (e.g. demo or host branding). */
  getDatasetBorderColor?: ContainerChartsDatasetBorderColorResolver
}

const defaultTimeline = '24h'

export const ContainerCharts = ({
  featureEnabled = true,
  disabledMessage = 'Container Charts feature is not enabled',
  combinations,
  isLoadingCombinations = false,
  title = 'Container Charts',
  selectedCombination: selectedCombinationProp,
  defaultSelectedCombination = null,
  onSelectedCombinationChange,
  chartRawData = null,
  isLoadingCharts = false,
  getDatasetBorderColor,
}: ContainerChartsProps): ReactElement => {
  const [internalSelection, setInternalSelection] = useState<string | null>(
    defaultSelectedCombination,
  )
  const controlled = selectedCombinationProp !== undefined
  const selectedCombination = controlled ? selectedCombinationProp : internalSelection

  const setSelectedCombination = (value: string | null) => {
    if (!controlled) {
      setInternalSelection(value)
    }
    onSelectedCombinationChange?.(value)
  }

  if (!featureEnabled) {
    return (
      <div className="mdk-container-charts" data-testid="container-charts-root">
        <EmptyState description={disabledMessage} image="simple" size="md" />
      </div>
    )
  }

  return (
    <div className="mdk-container-charts" data-testid="container-charts-root">
      {title ? <h1 className="mdk-container-charts__title">{title}</h1> : null}

      {isLoadingCombinations ? (
        <div
          className="mdk-container-charts__loading"
          data-testid="container-charts-combos-loading"
        >
          <Spinner />
        </div>
      ) : (
        <div className="mdk-container-charts__select-row">
          <span className="mdk-container-charts__select-label">Select combination:</span>
          <select
            className="mdk-container-charts__select"
            aria-label="Container combination"
            data-testid="container-charts-combination-select"
            value={selectedCombination ?? ''}
            onChange={(e) => {
              const v = e.target.value
              setSelectedCombination(v === '' ? null : v)
            }}
          >
            <option value="">—</option>
            {combinations.map(({ label, value }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedCombination ? (
        <div className="mdk-container-charts__layout" data-testid="container-charts-panel">
          {isBitdeer(selectedCombination) ? (
            <div className="mdk-container-charts__chart-block">
              <div className="mdk-container-charts__chart-title">Liquid Temp H</div>
              <LineChartCard
                title="Liquid Temp H"
                rawData={chartRawData}
                dataAdapter={(raw) =>
                  applyDatasetBorderColors(
                    'Liquid Temp H',
                    overviewChartResultToLineChartCardData(
                      getOverviewChartTempAdapter(raw as ChartEntry[], 'hot'),
                    ),
                    getDatasetBorderColor,
                  )
                }
                timelineOptions={[...CONTAINER_CHART_TIMELINE_OPTIONS]}
                defaultTimeline={defaultTimeline}
                isLoading={isLoadingCharts}
              />
            </div>
          ) : null}

          <div className="mdk-container-charts__chart-block">
            <div className="mdk-container-charts__chart-title">Liquid Temp L</div>
            <LineChartCard
              title="Liquid Temp L"
              rawData={chartRawData}
              dataAdapter={(raw) =>
                applyDatasetBorderColors(
                  'Liquid Temp L',
                  overviewChartResultToLineChartCardData(
                    getOverviewChartTempAdapter(raw as ChartEntry[], 'cold'),
                  ),
                  getDatasetBorderColor,
                )
              }
              timelineOptions={[...CONTAINER_CHART_TIMELINE_OPTIONS]}
              defaultTimeline={defaultTimeline}
              isLoading={isLoadingCharts}
            />
          </div>

          {!isMicroBT(selectedCombination) && !isAntspaceHydro(selectedCombination) ? (
            <div className="mdk-container-charts__chart-block">
              <div className="mdk-container-charts__chart-title">Oil Temp</div>
              <LineChartCard
                title="Oil Temp"
                rawData={chartRawData}
                dataAdapter={(raw) =>
                  applyDatasetBorderColors(
                    'Oil Temp',
                    overviewChartResultToLineChartCardData(
                      getOverviewChartOilAdapter(raw as ChartEntry[]),
                    ),
                    getDatasetBorderColor,
                  )
                }
                timelineOptions={[...CONTAINER_CHART_TIMELINE_OPTIONS]}
                defaultTimeline={defaultTimeline}
                isLoading={isLoadingCharts}
              />
            </div>
          ) : null}

          {!isAntspaceImmersion(_replace(selectedCombination, '_', '-')) ? (
            <div className="mdk-container-charts__chart-block">
              <div className="mdk-container-charts__chart-title">Pressure</div>
              <LineChartCard
                title="Pressure"
                rawData={chartRawData}
                dataAdapter={(raw) =>
                  applyDatasetBorderColors(
                    'Pressure',
                    overviewChartResultToLineChartCardData(
                      getOverviewChartPressureAdapter(raw as ChartEntry[]),
                    ),
                    getDatasetBorderColor,
                  )
                }
                timelineOptions={[...CONTAINER_CHART_TIMELINE_OPTIONS]}
                defaultTimeline={defaultTimeline}
                isLoading={isLoadingCharts}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
