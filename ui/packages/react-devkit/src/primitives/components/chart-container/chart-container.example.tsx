/**
 * Runnable example for ChartContainer.
 */
import { useState } from 'react'
import { ChartContainer } from '@tetherto/mdk-react-devkit'

const RANGE_OPTIONS = [
  { label: '1H', value: '1h' },
  { label: '24H', value: '24h' },
  { label: '7D', value: '7d' },
]

const LEGEND_DATA = [
  { label: 'Pool A', color: '#59E8E8' },
  { label: 'Pool B', color: '#FF9500' },
]

const MockChart = () => (
  <div
    style={{
      height: 160,
      background: 'var(--mdk-color-surface-secondary, #1a1a2e)',
      borderRadius: 4,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--mdk-color-text-secondary, #888)',
      fontSize: 13,
    }}
  >
    Chart content
  </div>
)

export const ChartContainerExample = () => {
  const [range, setRange] = useState('24h')

  return (
    <div className="mdk-example-row" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Basic with title only */}
      <ChartContainer title="Simple Chart">
        <MockChart />
      </ChartContainer>

      {/* Full-featured: highlighted value, legend, range selector, min/max/avg */}
      <ChartContainer
        title="Hashrate"
        highlightedValue={{ value: 102.4, unit: 'TH/s' }}
        legendData={LEGEND_DATA}
        rangeSelector={{ options: RANGE_OPTIONS, value: range, onChange: setRange }}
        minMaxAvg={{ min: '10 TH/s', avg: '55 TH/s', max: '100 TH/s' }}
      >
        <MockChart />
      </ChartContainer>

      {/* Loading state */}
      <ChartContainer title="Loading" loading>
        <MockChart />
      </ChartContainer>

      {/* Empty state */}
      <ChartContainer title="No Data" empty emptyMessage="No data available for this period">
        <MockChart />
      </ChartContainer>
    </div>
  )
}
