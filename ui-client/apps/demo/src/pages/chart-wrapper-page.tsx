import { BarChart, Button, ChartContainer, computeStats, LineChart, Loader, UNITS } from '@tetherto/mdk-core-ui'
import { ChartWrapper } from '@tetherto/mdk-foundation-ui'
import * as React from 'react'

/**
 * Mock chart data
 */
const BAR_CHART_MINING_OUTPUT = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [
    {
      label: 'Mining Output (TH/s)',
      data: [120, 190, 150, 175, 210, 185],
      backgroundColor: 'rgba(255, 147, 0, 0.6)',
      borderColor: 'rgba(255, 147, 0, 1)',
      borderWidth: 1,
    },
  ],
}

const BAR_CHART_REVENUE = {
  labels: ['Q1', 'Q2', 'Q3', 'Q4'],
  datasets: [
    {
      label: 'Revenue ($)',
      data: [45000, 52000, 48000, 61000],
      backgroundColor: 'rgba(34, 197, 94, 0.6)',
      borderColor: 'rgba(34, 197, 94, 1)',
      borderWidth: 1,
    },
  ],
}

const LINE_CHART_HASHRATE = {
  datasets: [
    {
      label: 'Hashrate (TH/s)',
      data: [140, 198, 180, 220].map((y, i) => ({
        x: new Date(`2026-01-0${i + 1}`).valueOf(),
        y,
      })),
      borderColor: 'rgb(34, 197, 94)',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      tension: 0.4,
    },
  ],
}

const LINE_CHART_TEMPERATURE = {
  datasets: [
    {
      label: 'Temperature (°C)',
      data: [55, 62, 68, 65, 58].map((y, i) => ({
        x: new Date(`2026-01-0${i + 1}`).valueOf(),
        y,
      })),
      borderColor: 'rgb(239, 68, 68)',
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
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4,
    },
  ],
}

const EMPTY_DATA = {
  labels: [],
  datasets: [],
}

/**
 * ChartWrapper with ChartContainer Demo
 */
export const ChartWrapperPage = (): React.ReactElement => {
  const [isLoadingBar, setIsLoadingBar] = React.useState(false)
  const [isLoadingLine, setIsLoadingLine] = React.useState(false)
  const [showBarData, setShowBarData] = React.useState(true)
  const [showLineData, setShowLineData] = React.useState(true)

  // Simulate loading for bar charts
  const handleLoadBarData = React.useCallback(() => {
    setIsLoadingBar(true)
    setTimeout(() => {
      setIsLoadingBar(false)
      setShowBarData(true)
    }, 1500)
  }, [])

  // Toggle bar chart data
  const handleToggleBarData = React.useCallback(() => {
    setShowBarData((prev) => !prev)
  }, [])

  // Simulate loading for line charts
  const handleLoadLineData = React.useCallback(() => {
    setIsLoadingLine(true)
    setTimeout(() => {
      setIsLoadingLine(false)
      setShowLineData(true)
    }, 1500)
  }, [])

  // Toggle line chart data
  const handleToggleLineData = React.useCallback(() => {
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
    <section className="demo-section">
      <h2 className="demo-section__title">Chart Wrapper</h2>

      {/* Bar Chart Controls */}
      <div
        style={{
          margin: '2rem 0',
          padding: '1.5rem',
          backgroundColor: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '0.5rem',
        }}
      >
        <h3
          style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: '#e5e5e5',
            marginBottom: '1rem',
          }}
        >
          Bar Chart Controls
        </h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Button onClick={handleLoadBarData} disabled={isLoadingBar}>
            {isLoadingBar ? 'Loading...' : 'Load Bar Charts'}
          </Button>
          <Button onClick={handleToggleBarData} variant="secondary">
            {showBarData ? 'Hide Bar Data' : 'Show Bar Data'}
          </Button>
        </div>
      </div>

      {/* BAR CHART EXAMPLES */}
      <section style={{ marginBottom: '4rem' }}>
        <h3
          style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            color: '#e5e5e5',
            marginBottom: '1.5rem',
            paddingBottom: '0.75rem',
            borderBottom: '2px solid #333',
          }}
        >
          Bar Charts with ChartWrapper + ChartContainer
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
            gap: '2rem',
          }}
        >
          {/* Example 1: Bar Chart - Mining Output with Title and Footer */}
          <div>
            <h4
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: '#ff9300',
                marginBottom: '1rem',
              }}
            >
              Mining Output (Title + Footer)
            </h4>
            <ChartWrapper
              data={showBarData ? BAR_CHART_MINING_OUTPUT : EMPTY_DATA}
              isLoading={isLoadingBar}
              minHeight={300}
            >
              <ChartContainer
                title="Mining Output"
                footer={
                  <span>
                    Min {miningOutputStats.min} TH/s · Max {miningOutputStats.max} TH/s · Avg{' '}
                    {miningOutputStats.avg.toFixed(1)} TH/s
                  </span>
                }
              >
                <BarChart height={300} data={BAR_CHART_MINING_OUTPUT} />
              </ChartContainer>
            </ChartWrapper>
          </div>

          {/* Example 2: Bar Chart - Mining Output with Custom Loader */}
          <div>
            <h4
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: '#ff9300',
                marginBottom: '1rem',
              }}
            >
              Chart with custom loader
            </h4>
            <ChartWrapper
              data={showBarData ? BAR_CHART_MINING_OUTPUT : EMPTY_DATA}
              isLoading={isLoadingBar}
              customLoader={<Loader />}
              minHeight={300}
            >
              <ChartContainer
                title="Mining Output"
                footer={
                  <span>
                    Min {miningOutputStats.min} TH/s · Max {miningOutputStats.max} TH/s · Avg{' '}
                    {miningOutputStats.avg.toFixed(1)} TH/s
                  </span>
                }
              >
                <BarChart height={300} data={BAR_CHART_MINING_OUTPUT} />
              </ChartContainer>
            </ChartWrapper>
          </div>

          {/* Example 2: Bar Chart - Revenue with Custom Empty */}
          <div>
            <h4
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: '#ff9300',
                marginBottom: '1rem',
              }}
            >
              Revenue (Custom Empty Message)
            </h4>
            <ChartWrapper
              data={showBarData ? BAR_CHART_REVENUE : EMPTY_DATA}
              isLoading={isLoadingBar}
              customNoDataMessage="No revenue data available for this quarter"
              minHeight={300}
            >
              <ChartContainer title="Quarterly Revenue">
                <BarChart height={300} data={BAR_CHART_REVENUE} />
              </ChartContainer>
            </ChartWrapper>
          </div>

          {/* Example 3: Bar Chart - Without Title */}
          <div>
            <h4
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: '#ff9300',
                marginBottom: '1rem',
              }}
            >
              Mining Output (No Title)
            </h4>
            <ChartWrapper
              data={showBarData ? BAR_CHART_MINING_OUTPUT : EMPTY_DATA}
              isLoading={isLoadingBar}
              minHeight={300}
            >
              <ChartContainer>
                <BarChart height={300} data={BAR_CHART_MINING_OUTPUT} />
              </ChartContainer>
            </ChartWrapper>
          </div>

          {/* Example 4: Bar Chart - Custom Empty Component */}
          <div>
            <h4
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: '#ff9300',
                marginBottom: '1rem',
              }}
            >
              Revenue (Custom Empty Component)
            </h4>
            <ChartWrapper
              data={showBarData ? BAR_CHART_REVENUE : EMPTY_DATA}
              isLoading={isLoadingBar}
              customNoDataMessage={
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '2rem',
                  }}
                >
                  <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.6 }}>💰</div>
                  <h4
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 600,
                      color: '#e5e5e5',
                      marginBottom: '0.5rem',
                    }}
                  >
                    No Revenue Data
                  </h4>
                  <p style={{ color: '#999', marginBottom: '1.5rem' }}>
                    Revenue data will be available soon
                  </p>
                  <Button onClick={() => setShowBarData(true)}>Load Data</Button>
                </div>
              }
              minHeight={300}
            >
              <ChartContainer title="Revenue">
                <BarChart height={300} data={BAR_CHART_REVENUE} />
              </ChartContainer>
            </ChartWrapper>
          </div>
        </div>
      </section>

      {/* Line Chart Controls */}
      <div
        style={{
          marginBottom: '2rem',
          padding: '1.5rem',
          backgroundColor: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '0.5rem',
        }}
      >
        <h3
          style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: '#e5e5e5',
            marginBottom: '1rem',
          }}
        >
          Line Chart Controls
        </h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Button onClick={handleLoadLineData} disabled={isLoadingLine}>
            {isLoadingLine ? 'Loading...' : 'Load Line Charts'}
          </Button>
          <Button onClick={handleToggleLineData} variant="secondary">
            {showLineData ? 'Hide Line Data' : 'Show Line Data'}
          </Button>
        </div>
      </div>

      {/* LINE CHART EXAMPLES */}
      <section style={{ marginBottom: '4rem' }}>
        <h3
          style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            color: '#e5e5e5',
            marginBottom: '1.5rem',
            paddingBottom: '0.75rem',
            borderBottom: '2px solid #333',
          }}
        >
          Line Charts with ChartWrapper + ChartContainer
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
            gap: '2rem',
          }}
        >
          {/* Example 5: Line Chart - Hashrate with Footer */}
          <div>
            <h4
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: '#ff9300',
                marginBottom: '1rem',
              }}
            >
              Hashrate (Title + Footer)
            </h4>
            <ChartWrapper
              data={showLineData ? LINE_CHART_HASHRATE : EMPTY_DATA}
              isLoading={isLoadingLine}
              minHeight={300}
            >
              <ChartContainer
                title="Hash Rate"
                footer={
                  <span>
                    Min {hashrateStats.min} TH/s · Max {hashrateStats.max} TH/s · Avg{' '}
                    {hashrateStats.avg.toFixed(1)} TH/s
                  </span>
                }
              >
                <LineChart
                  height={300}
                  yTicksFormatter={(v) => `${v} TH/s`}
                  data={LINE_CHART_HASHRATE}
                />
              </ChartContainer>
            </ChartWrapper>
          </div>

          {/* Example 6: Line Chart - Temperature with Points */}
          <div>
            <h4
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: '#ff9300',
                marginBottom: '1rem',
              }}
            >
              Temperature (With Points)
            </h4>
            <ChartWrapper
              data={showLineData ? LINE_CHART_TEMPERATURE : EMPTY_DATA}
              isLoading={isLoadingLine}
              minHeight={300}
            >
              <ChartContainer
                title="Temperature"
                footer={
                  <span>
                    Min {temperatureStats.min}
                    {UNITS.TEMPERATURE_C} · Max {temperatureStats.max}
                    {UNITS.TEMPERATURE_C} · Avg {temperatureStats.avg.toFixed(1)}
                    {UNITS.TEMPERATURE_C}
                  </span>
                }
              >
                <LineChart
                  height={300}
                  showPointMarkers
                  yTicksFormatter={(v) => `${v}${UNITS.TEMPERATURE_C}`}
                  data={LINE_CHART_TEMPERATURE}
                />
              </ChartContainer>
            </ChartWrapper>
          </div>

          {/* Example 7: Line Chart - Daily Revenue */}
          <div>
            <h4
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: '#ff9300',
                marginBottom: '1rem',
              }}
            >
              Daily Revenue (Currency Format)
            </h4>
            <ChartWrapper
              data={showLineData ? LINE_CHART_DAILY_REVENUE : EMPTY_DATA}
              isLoading={isLoadingLine}
              customNoDataMessage="No daily revenue data available"
              minHeight={300}
            >
              <ChartContainer
                title="Daily Revenue"
                footer={
                  <span>
                    Min ${revenueStats.min.toLocaleString()} · Max $
                    {revenueStats.max.toLocaleString()} · Avg ${revenueStats.avg.toFixed(0)}
                  </span>
                }
              >
                <LineChart
                  height={300}
                  yTicksFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
                  data={LINE_CHART_DAILY_REVENUE}
                />
              </ChartContainer>
            </ChartWrapper>
          </div>

          {/* Example 8: Line Chart - Hashrate without Legend */}
          <div>
            <h4
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: '#ff9300',
                marginBottom: '1rem',
              }}
            >
              Hashrate (No Legend)
            </h4>
            <ChartWrapper
              data={showLineData ? LINE_CHART_HASHRATE : EMPTY_DATA}
              isLoading={isLoadingLine}
              minHeight={300}
            >
              <ChartContainer title="Hash Rate">
                <LineChart
                  height={300}
                  yTicksFormatter={(v) => `${v} TH/s`}
                  data={LINE_CHART_HASHRATE}
                />
              </ChartContainer>
            </ChartWrapper>
          </div>
        </div>
      </section>
    </section>
  )
}
