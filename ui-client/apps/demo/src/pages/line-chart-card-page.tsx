import { useState } from 'react'

import { LineChartCard, WEBAPP_NAME } from '@tetherto/foundation'
import type { LineChartCardData } from '@tetherto/foundation'

const now = Date.now()
const HOUR = 3_600_000

const generateTimeSeries = (
  count: number,
  baseValue: number,
  variance: number,
): Array<{ x: number; y: number }> =>
  Array.from({ length: count }, (_, i) => ({
    x: now - (count - 1 - i) * HOUR,
    y: baseValue + (Math.random() - 0.5) * variance,
  }))

const TIMELINE_OPTIONS = [
  { label: '5 Min', value: '5m' },
  { label: '30 Min', value: '30m' },
  { label: '1 H', value: '1h' },
  { label: '3 H', value: '3h' },
  { label: '1 D', value: '1D' },
]

const BASIC_DATA: LineChartCardData = {
  datasets: [
    {
      label: 'Hashrate',
      borderColor: '#59E8E8',
      data: generateTimeSeries(24, 75, 10),
    },
  ],
  highlightedValue: { value: '75.46', unit: 'TH/s' },
  yTicksFormatter: (v: number) => `${v.toFixed(1)} TH/s`,
}

const MULTI_SERIES_DATA: LineChartCardData = {
  datasets: [
    {
      label: `${WEBAPP_NAME} Hashrate`,
      borderColor: '#59E8E8',
      data: generateTimeSeries(24, 75, 10),
    },
    {
      label: 'Pool Hashrate',
      borderColor: '#4A6CF7',
      data: generateTimeSeries(24, 60, 8),
    },
  ],
  highlightedValue: { value: '75.46', unit: 'TH/s' },
  yTicksFormatter: (v: number) => `${v.toFixed(1)} TH/s`,
  minMaxAvg: { min: '65.2 TH/s', max: '82.1 TH/s', avg: '75.5 TH/s' },
}

const DETAIL_LEGENDS_DATA: LineChartCardData = {
  datasets: [
    {
      label: 'Hashrate',
      borderColor: '#59E8E8',
      data: generateTimeSeries(24, 75, 10),
      currentValue: { value: 3590, unit: 'TH/s' },
      percentChange: 2.5,
    },
    {
      label: 'Pool Rate',
      borderColor: '#4A6CF7',
      data: generateTimeSeries(24, 60, 8),
      currentValue: { value: 2870, unit: 'TH/s' },
      percentChange: -1.3,
    },
  ],
  highlightedValue: { value: '3,590', unit: 'TH/s' },
  yTicksFormatter: (v: number) => `${v.toFixed(0)} TH/s`,
  minMaxAvg: { min: '3,210 TH/s', max: '3,780 TH/s', avg: '3,590 TH/s' },
}

const FOOTER_STATS_DATA: LineChartCardData = {
  datasets: [
    {
      label: 'Power',
      borderColor: '#F97316',
      data: generateTimeSeries(24, 450, 50),
    },
  ],
  highlightedValue: { value: '452', unit: 'kW' },
  yTicksFormatter: (v: number) => `${v.toFixed(0)} kW`,
  minMaxAvg: { min: '410 kW', max: '490 kW', avg: '452 kW' },
  footerStats: [
    { label: 'Total Consumption', value: '10.8 MWh' },
    { label: 'Cost (est.)', value: '$864' },
    { label: 'Efficiency', value: '29.5 W/TH' },
    { label: 'PUE', value: '1.12' },
  ],
  footerStatsPerColumn: 2,
  secondaryLabel: { title: 'Period', value: 'Last 24h' },
}

const RAW_DATA_EXAMPLE = [
  { ts: now - 23 * HOUR, hashrate_mhs_1m_sum_aggr: 72_500_000 },
  { ts: now - 20 * HOUR, hashrate_mhs_1m_sum_aggr: 74_200_000 },
  { ts: now - 17 * HOUR, hashrate_mhs_1m_sum_aggr: 76_800_000 },
  { ts: now - 14 * HOUR, hashrate_mhs_1m_sum_aggr: 73_100_000 },
  { ts: now - 11 * HOUR, hashrate_mhs_1m_sum_aggr: 75_500_000 },
  { ts: now - 8 * HOUR, hashrate_mhs_1m_sum_aggr: 77_900_000 },
  { ts: now - 5 * HOUR, hashrate_mhs_1m_sum_aggr: 74_600_000 },
  { ts: now - 2 * HOUR, hashrate_mhs_1m_sum_aggr: 76_300_000 },
]

const rawDataAdapter = (data: unknown): LineChartCardData => {
  const points = data as Array<{ ts: number; hashrate_mhs_1m_sum_aggr: number }>
  return {
    datasets: [
      {
        label: 'Hashrate',
        borderColor: '#59E8E8',
        data: points.map((p) => ({ x: p.ts, y: p.hashrate_mhs_1m_sum_aggr / 1_000_000 })),
      },
    ],
    highlightedValue: { value: '76.3', unit: 'TH/s' },
    yTicksFormatter: (v: number) => `${v.toFixed(1)} TH/s`,
  }
}

export const LineChartCardPage = (): JSX.Element => {
  const [timeline, setTimeline] = useState('5m')

  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Line Chart Card</h2>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
        Composable chart card with timeline selector, legend, lightweight-charts renderer, and stats
        footer. Part of <code>@tetherto/foundation</code>.
      </p>

      <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr' }}>
        <section>
          <h3>Basic — single dataset</h3>
          <LineChartCard
            title="Hashrate"
            data={BASIC_DATA}
            timelineOptions={TIMELINE_OPTIONS}
            defaultTimeline="3h"
          />
        </section>

        <section>
          <h3>Multi-series with legend and min/max/avg footer</h3>
          <LineChartCard
            title="Hashrate Comparison"
            data={MULTI_SERIES_DATA}
            timelineOptions={TIMELINE_OPTIONS}
            timeline={timeline}
            onTimelineChange={setTimeline}
          />
        </section>

        <section>
          <h3>Detail legends with current values and percentage change</h3>
          <LineChartCard
            title="Site Hashrate"
            data={DETAIL_LEGENDS_DATA}
            detailLegends
            timelineOptions={TIMELINE_OPTIONS}
            defaultTimeline="1h"
          />
        </section>

        <section>
          <h3>Full footer — min/max/avg + stats grid + secondary label</h3>
          <LineChartCard
            title="Power Consumption"
            data={FOOTER_STATS_DATA}
            timelineOptions={TIMELINE_OPTIONS}
            defaultTimeline="1D"
          />
        </section>

        <section>
          <h3>Raw data with adapter</h3>
          <LineChartCard
            title="Hashrate (from raw API data)"
            rawData={RAW_DATA_EXAMPLE}
            dataAdapter={rawDataAdapter}
            timelineOptions={TIMELINE_OPTIONS}
            defaultTimeline="1D"
          />
        </section>

        <section>
          <h3>Loading state</h3>
          <LineChartCard title="Hashrate" isLoading timelineOptions={TIMELINE_OPTIONS} />
        </section>

        <section>
          <h3>Empty state (no data)</h3>
          <LineChartCard
            title="Hashrate"
            data={{ datasets: [] }}
            timelineOptions={TIMELINE_OPTIONS}
          />
        </section>
      </div>
    </section>
  )
}
