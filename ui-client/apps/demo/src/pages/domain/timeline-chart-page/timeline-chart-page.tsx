import type { ReactElement } from 'react'
import { DemoPageHeader } from '../../../components/demo-page-header'
import { TimelineChart } from '@mdk/foundation'
import { DemoBlock } from '../../../components/demo-block'
import { DATA_BASIC, DATA_EMPTY, DATA_MANY_ROWS, DATA_MINER_STATUS, HOUR, NOW } from './mock-data'
import '../../dashboard/line-chart-page.scss'

export const TimelineChartDemo = (): ReactElement => (
  <div className="line-chart-page">
    <DemoPageHeader
      title="Timeline Chart"
      description={
        <>
          A reusable Gantt-like timeline visualization component using <code>TimelineChart</code>.
          Displays horizontal time bars for multiple rows.
        </>
      }
    />

    <div className="line-chart-page__examples">
      <DemoBlock
        title="Basic Timeline — Tasks"
        description="Simple task timeline with multiple states: In Progress, Completed, and Blocked."
      >
        <TimelineChart
          initialData={DATA_BASIC}
          title="Project Timeline"
          axisTitleText={{ x: 'Time', y: 'Tasks' }}
        />
      </DemoBlock>

      <DemoBlock
        title="Miner Status Timeline"
        description="Simulates miner power mode states over 4 hours with random transitions."
      >
        <TimelineChart
          initialData={DATA_MINER_STATUS}
          title="Miner Status History"
          axisTitleText={{ x: 'Time', y: 'Miner' }}
        />
      </DemoBlock>

      <h2 className="line-chart-page__group-title">Variations</h2>

      <DemoBlock
        title="Many Rows — Scrollable"
        description="20 rows demonstrating the scrollable behavior for large datasets."
      >
        <TimelineChart
          initialData={DATA_MANY_ROWS}
          title="Large Dataset"
          axisTitleText={{ x: 'Time', y: 'Rows' }}
        />
      </DemoBlock>

      <DemoBlock title="No Title" description="Timeline chart without a title header.">
        <TimelineChart initialData={DATA_BASIC} axisTitleText={{ x: 'Time', y: 'Tasks' }} />
      </DemoBlock>

      <DemoBlock title="No Axis Labels" description="Timeline chart without axis title labels.">
        <TimelineChart initialData={DATA_BASIC} title="Minimal Timeline" />
      </DemoBlock>

      <h2 className="line-chart-page__group-title">States</h2>

      <DemoBlock
        title="Loading State"
        description="Shows the loading indicator while data is being fetched."
      >
        <TimelineChart initialData={DATA_EMPTY} isLoading title="Loading Timeline" />
      </DemoBlock>

      <DemoBlock
        title="Empty State"
        description="No data available — shows the empty state message."
      >
        <TimelineChart initialData={DATA_EMPTY} title="Empty Timeline" />
      </DemoBlock>

      <DemoBlock
        title="With Fixed Range"
        description="Timeline with explicit min/max range bounds."
      >
        <TimelineChart
          initialData={DATA_BASIC}
          range={{
            min: NOW - 3 * HOUR,
            max: NOW + HOUR,
          }}
          title="Fixed Range Timeline"
          axisTitleText={{ x: 'Time', y: 'Tasks' }}
        />
      </DemoBlock>
    </div>
  </div>
)
