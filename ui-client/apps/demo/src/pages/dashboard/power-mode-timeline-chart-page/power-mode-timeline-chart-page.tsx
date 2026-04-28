import type { ReactElement } from 'react'
import { DemoPageHeader } from '../../../components/demo-page-header'
import { PowerModeTimelineChart } from '@tetherto/foundation'
import {
  DATA_1H,
  DATA_24H,
  DATA_MANY_MINERS,
  DATA_SINGLE_MINER,
  DATA_STEADY,
} from './power-mode-timeline-chart-page.mock'
import { DemoBlock } from '../../../components/demo-block'
import '../line-chart-page.scss'

export const PowerModeTimelineChartDemo = (): ReactElement => (
  <div className="line-chart-page">
    <DemoPageHeader
      title="Power Mode Timeline Chart"
      description={
        <>
          Visualizes miner power mode changes over time using <code>PowerModeTimelineChart</code>.
          Built on top of <code>TimelineChart</code> with power mode-specific data transformation.
        </>
      }
    />

    <div className="line-chart-page__examples">
      <DemoBlock
        title="24 Hour View — 5 Miners"
        description="288 data points at 5-minute intervals showing power mode transitions across multiple miners."
      >
        <PowerModeTimelineChart data={DATA_24H} timezone="UTC" />
      </DemoBlock>

      <DemoBlock
        title="1 Hour View — 3 Miners"
        description="60 data points at 1-minute intervals for a shorter time window with fewer miners."
      >
        <PowerModeTimelineChart data={DATA_1H} timezone="UTC" />
      </DemoBlock>

      <h2 className="line-chart-page__group-title">State Variations</h2>

      <DemoBlock
        title="Steady State — Minimal Transitions"
        description="Two miners with few power mode changes to demonstrate stable operation visualization."
      >
        <PowerModeTimelineChart data={DATA_STEADY} timezone="UTC" />
      </DemoBlock>

      <DemoBlock
        title="Single Miner Timeline"
        description="Power mode history for a single miner over 2 hours."
      >
        <PowerModeTimelineChart data={DATA_SINGLE_MINER} timezone="UTC" />
      </DemoBlock>

      <DemoBlock
        title="Many Miners — Scrollable"
        description="15 miners demonstrating the scrollable rows behavior for large datasets."
      >
        <PowerModeTimelineChart data={DATA_MANY_MINERS} timezone="UTC" />
      </DemoBlock>

      <h2 className="line-chart-page__group-title">Edge Cases</h2>

      <DemoBlock
        title="Loading State"
        description="Shows the loading indicator while data is being fetched."
      >
        <PowerModeTimelineChart data={[]} isLoading timezone="UTC" />
      </DemoBlock>

      <DemoBlock
        title="Empty State"
        description="No data available — shows the empty state message."
      >
        <PowerModeTimelineChart data={[]} timezone="UTC" />
      </DemoBlock>

      <DemoBlock
        title="Custom Title"
        description="Demonstrates the custom title prop for the chart."
      >
        <PowerModeTimelineChart
          data={DATA_1H}
          timezone="UTC"
          title="Container Power Mode History"
        />
      </DemoBlock>

      <DemoBlock
        title="Different Timezone (America/New_York)"
        description="Demonstrates timezone offset application for time display."
      >
        <PowerModeTimelineChart data={DATA_1H} timezone="America/New_York" />
      </DemoBlock>
    </div>
  </div>
)
