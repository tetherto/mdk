import { useState } from 'react'
import type { JSX } from 'react'

import { LineChartCard } from '@tetherto/mdk-react-devkit/foundation'

import {
  BASIC_DATA,
  DETAIL_LEGENDS_DATA,
  FOOTER_STATS_DATA,
  MULTI_SERIES_DATA,
  RAW_DATA_EXAMPLE,
  rawDataAdapter,
  TIMELINE_OPTIONS,
} from './line-chart-card-page.fixtures'

/**
 * LineChartCard demo. Each variant illustrates a different
 * `LineChartCardData` shape. In production, source the `data` prop
 * from `useHashrateChartData()` / `useSiteConsumptionChartData()`
 * (`@tetherto/mdk-react-adapter`) — see ./line-chart-card-page.fixtures.ts.
 */
export const LineChartCardPage = (): JSX.Element => {
  const [timeline, setTimeline] = useState('5m')

  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Line Chart Card</h2>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
        Composable chart card with timeline selector, legend, lightweight-charts renderer, and stats
        footer. Part of <code>@tetherto/mdk-react-devkit</code>.
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
