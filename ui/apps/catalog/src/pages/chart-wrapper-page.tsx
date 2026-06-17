import {
  BarChart,
  Button,
  ChartContainer,
  COLOR,
  computeStats,
  CURRENCY,
  formatMinMaxAvg,
  LineChart,
  Loader,
  UNITS,
} from '@tetherto/mdk-react-devkit/core'
import type { ChartTooltipConfig } from '@tetherto/mdk-react-devkit/core'
import { ChartWrapper } from '@tetherto/mdk-react-devkit/foundation'
import { type ReactElement, type ReactNode, useCallback, useState } from 'react'

import { BAR_CHART_MINING_OUTPUT } from '../constants/demo-chart-data'
import './chart-wrapper-page.scss'

const miningOutputTooltip: ChartTooltipConfig = {
  valueFormatter: (value) => `${value.toLocaleString()} ${UNITS.HASHRATE_TH_S}`,
}

const revenueTooltip: ChartTooltipConfig = {
  valueFormatter: (value) => `${CURRENCY.USD}${value.toLocaleString()}`,
}

const BAR_CHART_REVENUE = {
  labels: ['Q1', 'Q2', 'Q3', 'Q4'],
  datasets: [
    {
      label: `Revenue (${CURRENCY.USD_LABEL})`,
      data: [45000, 52000, 48000, 61000],
      backgroundColor: COLOR.GREEN,
      borderColor: COLOR.GREEN,
    },
  ],
}

const LINE_CHART_HASHRATE = {
  datasets: [
    {
      label: `Hashrate (${UNITS.HASHRATE_TH_S})`,
      data: [140, 198, 180, 220].map((y, i) => ({
        x: new Date(`2026-01-0${i + 1}`).valueOf(),
        y,
      })),
      borderColor: COLOR.GRASS_GREEN,
      backgroundColor: 'rgba(52, 199, 89, 0.1)',
      tension: 0.4,
    },
  ],
}

const LINE_CHART_TEMPERATURE = {
  datasets: [
    {
      label: `Temperature (${UNITS.TEMPERATURE_C})`,
      data: [55, 62, 68, 65, 58].map((y, i) => ({
        x: new Date(`2026-01-0${i + 1}`).valueOf(),
        y,
      })),
      borderColor: COLOR.RED,
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      tension: 0.4,
    },
  ],
}

const LINE_CHART_DAILY_REVENUE = {
  datasets: [
    {
      label: 'Daily Revenue',
      data: [12000, 15000, 13000, 17000, 14000, 16000, 18000].map((y, i) => ({
        x: new Date(`2026-01-0${i + 1}`).valueOf(),
        y,
      })),
      borderColor: COLOR.BLUE,
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4,
    },
  ],
}

type LineChartDemoData = {
  datasets: Array<{
    label?: string
    borderColor: string
    backgroundColor?: string
    tension?: number
    visible?: boolean
    data: Array<{ x: number; y: number }>
  }>
}

const withVisibleDatasets = (data: LineChartDemoData): LineChartDemoData => ({
  datasets: data.datasets.map((ds) => ({ ...ds, visible: true })),
})

const lineChartLegend = (data: LineChartDemoData) =>
  data.datasets.map((ds) => ({
    label: ds.label ?? '',
    color: String(ds.borderColor),
    hidden: ds.visible === false,
  }))

const hashrateMinMaxAvg = (stats: ReturnType<typeof computeStats>) =>
  formatMinMaxAvg(stats, (value, key) =>
    key === 'avg' ? `${value.toFixed(1)} ${UNITS.HASHRATE_TH_S}` : `${value} ${UNITS.HASHRATE_TH_S}`,
  )

const temperatureMinMaxAvg = (stats: ReturnType<typeof computeStats>) =>
  formatMinMaxAvg(stats, (value, key) =>
    key === 'avg' ? `${value.toFixed(1)}${UNITS.TEMPERATURE_C}` : `${value}${UNITS.TEMPERATURE_C}`,
  )

const revenueMinMaxAvg = (stats: ReturnType<typeof computeStats>) =>
  formatMinMaxAvg(stats, (value, key) =>
    key === 'avg'
      ? `${CURRENCY.USD}${value.toFixed(0)}`
      : `${CURRENCY.USD}${value.toLocaleString()}`,
  )

const ChartWrapperDemoCard = ({
  title,
  children,
  withPanelBackground = true,
}: {
  title: string
  children: ReactNode
  withPanelBackground?: boolean
}): ReactElement => (
  <div className="chart-wrapper-page__card">
    <h4 className="chart-wrapper-page__card-title">{title}</h4>
    <div
      className={
        withPanelBackground
          ? 'chart-wrapper-page__chart-panel'
          : 'chart-wrapper-page__chart-slot'
      }
    >
      {children}
    </div>
  </div>
)

const EMPTY_DATA = {
  labels: [],
  datasets: [],
}

/**
 * ChartWrapper with ChartContainer Demo
 */
export const ChartWrapperPage = (): ReactElement => {
  const [isLoadingBar, setIsLoadingBar] = useState(false)
  const [isLoadingLine, setIsLoadingLine] = useState(false)
  const [showBarData, setShowBarData] = useState(true)
  const [showLineData, setShowLineData] = useState(true)

  const [hashrateChartData, setHashrateChartData] = useState(() =>
    withVisibleDatasets(LINE_CHART_HASHRATE),
  )
  const [temperatureChartData, setTemperatureChartData] = useState(() =>
    withVisibleDatasets(LINE_CHART_TEMPERATURE),
  )
  const [dailyRevenueChartData, setDailyRevenueChartData] = useState(() =>
    withVisibleDatasets(LINE_CHART_DAILY_REVENUE),
  )

  const toggleLineDataset = useCallback(
    (setData: React.Dispatch<React.SetStateAction<LineChartDemoData>>, index: number) => {
      setData((prev) => ({
        datasets: prev.datasets.map((ds, i) =>
          i === index ? { ...ds, visible: ds.visible === false } : ds,
        ),
      }))
    },
    [],
  )

  // Simulate loading for bar charts
  const handleLoadBarData = useCallback(() => {
    setIsLoadingBar(true)
    setTimeout(() => {
      setIsLoadingBar(false)
      setShowBarData(true)
    }, 1500)
  }, [])

  // Toggle bar chart data
  const handleToggleBarData = useCallback(() => {
    setShowBarData((prev) => !prev)
  }, [])

  // Simulate loading for line charts
  const handleLoadLineData = useCallback(() => {
    setIsLoadingLine(true)
    setTimeout(() => {
      setIsLoadingLine(false)
      setShowLineData(true)
    }, 1500)
  }, [])

  // Toggle line chart data
  const handleToggleLineData = useCallback(() => {
    setShowLineData((prev) => !prev)
  }, [])

  // Compute stats
  const miningOutputData = BAR_CHART_MINING_OUTPUT.datasets[0]?.data as number[]
  const miningOutputStats = computeStats(miningOutputData)

  const hashrateData = LINE_CHART_HASHRATE.datasets[0]?.data.map(({ y }) => y) ?? []
  const hashrateStats = computeStats(hashrateData)

  const temperatureData = LINE_CHART_TEMPERATURE.datasets[0]?.data.map(({ y }) => y) ?? []
  const temperatureStats = computeStats(temperatureData)

  const revenueData = LINE_CHART_DAILY_REVENUE.datasets[0]?.data.map(({ y }) => y) ?? []
  const revenueStats = computeStats(revenueData)

  return (
    <section className="demo-section chart-wrapper-page">
      <h2 className="demo-section__title">Chart Wrapper</h2>

      <div className="chart-wrapper-page__controls">
        <h3 className="chart-wrapper-page__controls-title">Bar Chart Controls</h3>
        <div className="chart-wrapper-page__controls-actions">
          <Button onClick={handleLoadBarData} disabled={isLoadingBar}>
            {isLoadingBar ? 'Loading...' : 'Load Bar Charts'}
          </Button>
          <Button onClick={handleToggleBarData} variant="secondary">
            {showBarData ? 'Hide Bar Data' : 'Show Bar Data'}
          </Button>
        </div>
      </div>

      <section className="chart-wrapper-page__section">
        <h3 className="chart-wrapper-page__section-title">
          Bar Charts with ChartWrapper + ChartContainer
        </h3>

        <div className="chart-wrapper-page__grid">
          <ChartWrapperDemoCard title="Mining Output (Title + Footer)">
            <ChartWrapper
              data={showBarData ? BAR_CHART_MINING_OUTPUT : EMPTY_DATA}
              isLoading={isLoadingBar}
              minHeight={300}
            >
              <ChartContainer
                title="Mining Output"
                minMaxAvg={hashrateMinMaxAvg(miningOutputStats)}
              >
                <BarChart
                  height={300}
                  data={BAR_CHART_MINING_OUTPUT}
                  tooltip={miningOutputTooltip}
                  legendAlign="start"
                />
              </ChartContainer>
            </ChartWrapper>
          </ChartWrapperDemoCard>

          <ChartWrapperDemoCard title="Chart with custom loader">
            <ChartWrapper
              data={showBarData ? BAR_CHART_MINING_OUTPUT : EMPTY_DATA}
              isLoading={isLoadingBar}
              customLoader={<Loader />}
              minHeight={300}
            >
              <ChartContainer
                title="Mining Output"
                minMaxAvg={hashrateMinMaxAvg(miningOutputStats)}
              >
                <BarChart
                  height={300}
                  data={BAR_CHART_MINING_OUTPUT}
                  tooltip={miningOutputTooltip}
                  legendAlign="start"
                />
              </ChartContainer>
            </ChartWrapper>
          </ChartWrapperDemoCard>

          <ChartWrapperDemoCard title="Revenue (Custom Empty Message)">
            <ChartWrapper
              data={showBarData ? BAR_CHART_REVENUE : EMPTY_DATA}
              isLoading={isLoadingBar}
              customNoDataMessage="No revenue data available for this quarter"
              minHeight={300}
            >
              <ChartContainer title="Quarterly Revenue">
                <BarChart
                  height={300}
                  data={BAR_CHART_REVENUE}
                  tooltip={revenueTooltip}
                  legendAlign="start"
                />
              </ChartContainer>
            </ChartWrapper>
          </ChartWrapperDemoCard>

          <ChartWrapperDemoCard title="Mining Output (No Title)">
            <ChartWrapper
              data={showBarData ? BAR_CHART_MINING_OUTPUT : EMPTY_DATA}
              isLoading={isLoadingBar}
              minHeight={300}
            >
              <ChartContainer>
                <BarChart
                  height={300}
                  data={BAR_CHART_MINING_OUTPUT}
                  tooltip={miningOutputTooltip}
                  legendAlign="start"
                />
              </ChartContainer>
            </ChartWrapper>
          </ChartWrapperDemoCard>

          <ChartWrapperDemoCard title="Revenue (Custom Empty Component)">
            <ChartWrapper
              data={showBarData ? BAR_CHART_REVENUE : EMPTY_DATA}
              isLoading={isLoadingBar}
              customNoDataMessage={
                <div className="chart-wrapper-page__empty-custom">
                  <div className="chart-wrapper-page__empty-custom-icon">💰</div>
                  <h4 className="chart-wrapper-page__empty-custom-title">No Revenue Data</h4>
                  <p className="chart-wrapper-page__empty-custom-text">
                    Revenue data will be available soon
                  </p>
                  <Button onClick={() => setShowBarData(true)}>Load Data</Button>
                </div>
              }
              minHeight={300}
            >
              <ChartContainer title="Revenue">
                <BarChart
                  height={300}
                  data={BAR_CHART_REVENUE}
                  tooltip={revenueTooltip}
                  legendAlign="start"
                />
              </ChartContainer>
            </ChartWrapper>
          </ChartWrapperDemoCard>
        </div>
      </section>

      <div className="chart-wrapper-page__controls">
        <h3 className="chart-wrapper-page__controls-title">Line Chart Controls</h3>
        <div className="chart-wrapper-page__controls-actions">
          <Button onClick={handleLoadLineData} disabled={isLoadingLine}>
            {isLoadingLine ? 'Loading...' : 'Load Line Charts'}
          </Button>
          <Button onClick={handleToggleLineData} variant="secondary">
            {showLineData ? 'Hide Line Data' : 'Show Line Data'}
          </Button>
        </div>
      </div>

      <section className="chart-wrapper-page__section">
        <h3 className="chart-wrapper-page__section-title">
          Line Charts with ChartWrapper + ChartContainer
        </h3>

        <div className="chart-wrapper-page__grid">
          <ChartWrapperDemoCard title="Hashrate (Title + Footer)">
            <ChartWrapper
              data={showLineData ? hashrateChartData : EMPTY_DATA}
              isLoading={isLoadingLine}
              minHeight={300}
            >
              <ChartContainer
                title="Hash Rate"
                legendData={lineChartLegend(hashrateChartData)}
                onToggleDataset={(index) => toggleLineDataset(setHashrateChartData, index)}
                minMaxAvg={hashrateMinMaxAvg(hashrateStats)}
              >
                <LineChart
                  height={300}
                  yTicksFormatter={(value) => `${value} ${UNITS.HASHRATE_TH_S}`}
                  data={hashrateChartData}
                />
              </ChartContainer>
            </ChartWrapper>
          </ChartWrapperDemoCard>

          <ChartWrapperDemoCard title="Temperature (With Points)">
            <ChartWrapper
              data={showLineData ? temperatureChartData : EMPTY_DATA}
              isLoading={isLoadingLine}
              minHeight={300}
            >
              <ChartContainer
                title="Temperature"
                legendData={lineChartLegend(temperatureChartData)}
                onToggleDataset={(index) => toggleLineDataset(setTemperatureChartData, index)}
                minMaxAvg={temperatureMinMaxAvg(temperatureStats)}
              >
                <LineChart
                  height={300}
                  showPointMarkers
                  yTicksFormatter={(value) => `${value}${UNITS.TEMPERATURE_C}`}
                  data={temperatureChartData}
                />
              </ChartContainer>
            </ChartWrapper>
          </ChartWrapperDemoCard>

          <ChartWrapperDemoCard title="Daily Revenue (Currency Format)">
            <ChartWrapper
              data={showLineData ? dailyRevenueChartData : EMPTY_DATA}
              isLoading={isLoadingLine}
              customNoDataMessage="No daily revenue data available"
              minHeight={300}
            >
              <ChartContainer
                title="Daily Revenue"
                legendData={lineChartLegend(dailyRevenueChartData)}
                onToggleDataset={(index) => toggleLineDataset(setDailyRevenueChartData, index)}
                minMaxAvg={revenueMinMaxAvg(revenueStats)}
              >
                <LineChart
                  height={300}
                  yTicksFormatter={(value) => `${CURRENCY.USD}${(value / 1000).toFixed(1)}k`}
                  data={dailyRevenueChartData}
                />
              </ChartContainer>
            </ChartWrapper>
          </ChartWrapperDemoCard>

          <ChartWrapperDemoCard title="Hashrate (No Legend)">
            <ChartWrapper
              data={showLineData ? LINE_CHART_HASHRATE : EMPTY_DATA}
              isLoading={isLoadingLine}
              minHeight={300}
            >
              <ChartContainer title="Hash Rate">
                <LineChart
                  height={300}
                  yTicksFormatter={(value) => `${value} ${UNITS.HASHRATE_TH_S}`}
                  data={hashrateChartData}
                />
              </ChartContainer>
            </ChartWrapper>
          </ChartWrapperDemoCard>
        </div>
      </section>
    </section>
  )
}
