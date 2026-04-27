import type { ReactElement } from 'react'

import { DemoPageHeader } from '../../../components/demo-page-header'
import { ConsumptionLineChart } from '@mdk/foundation'
import { DemoBlock } from '../../../components/demo-block'
import '../line-chart-page.scss'

const NOW_S = Math.floor(Date.now() / 1000)
const MIN_S = 60

const makePowerData = (count: number, stepS: number, baseW: number, jitter = 0.03) =>
  Array.from({ length: count }, (_, i) => {
    const ts = (NOW_S - (count - 1 - i) * stepS) * 1000 // milliseconds
    const fluctuation = baseW * jitter * (Math.random() * 2 - 1)
    return { ts, power_w_sum_aggr: Math.max(0, baseW + fluctuation) }
  })

const makeContainerData = (count: number, stepS: number, tag: string) => {
  const key = `container_power_w_aggr`
  const containerKey = tag.replace(/^container-/, '')
  return Array.from({ length: count }, (_, i) => ({
    ts: (NOW_S - (count - 1 - i) * stepS) * 1000,
    [key]: { [containerKey]: 800_000 + Math.random() * 50_000 },
  }))
}

const DATA_24H = makePowerData(288, 5 * MIN_S, 1_400_000)
const DATA_CONTAINER = makeContainerData(288, 5 * MIN_S, 'container-c1')
const DATA_MW = makePowerData(288, 5 * MIN_S, 4_200_000) // MW range

const TIMELINE_OPTIONS = [
  { label: '5 Min', value: '5m' },
  { label: '30 Min', value: '30m' },
  { label: '3 H', value: '3h' },
  { label: '1 D', value: '1D' },
]

const TIMELINE_OPTIONS_WITH_1M = [{ label: '1 Min', value: '1m' }, ...TIMELINE_OPTIONS]

export const ConsumptionLineChartDemo = (): ReactElement => (
  <div className="line-chart-page">
    <DemoPageHeader
      title="Consumption Line Chart"
      description={
        <>
          Renders power consumption over time using <code>ConsumptionLineChart</code>. Auto-selects
          W / kW / MW based on data magnitude.
        </>
      }
    />

    <div className="line-chart-page__examples">
      <DemoBlock
        title="24 H Steady — kW range (~1.4 MW)"
        description="288 data points at 5-min intervals. Default t-miner tag → power_w_sum_aggr attribute."
      >
        <ConsumptionLineChart tag="t-miner" data={DATA_24H} timelineOptions={TIMELINE_OPTIONS} />
      </DemoBlock>

      <DemoBlock
        title="MW range (~4.2 MW)"
        description="Large-scale site — values auto-format to MW in the header and Y-axis."
      >
        <ConsumptionLineChart tag="t-miner" data={DATA_MW} timelineOptions={TIMELINE_OPTIONS} />
      </DemoBlock>

      <h2 className="line-chart-page__group-title">Attribute Variants</h2>

      <DemoBlock
        title="Container Tag"
        description="tag='container-c1' → reads container_power_w_aggr.c1 from data."
      >
        <ConsumptionLineChart
          tag="container-c1"
          data={DATA_CONTAINER}
          timelineOptions={TIMELINE_OPTIONS}
        />
      </DemoBlock>

      <DemoBlock
        title="Custom powerAttribute"
        description="powerAttribute='power_w_sum_aggr' overrides any derived attribute logic."
      >
        <ConsumptionLineChart
          tag="t-miner"
          data={DATA_24H}
          powerAttribute="power_w_sum_aggr"
          label="Custom Power"
          timelineOptions={TIMELINE_OPTIONS}
        />
      </DemoBlock>

      <h2 className="line-chart-page__group-title">Options & States</h2>

      <DemoBlock
        title="1 Min Interval Enabled"
        description="isOneMinEnabled=true → defaultTimeline falls back to '1m' and prepends the 1 Min button."
      >
        <ConsumptionLineChart
          tag="t-miner"
          data={DATA_24H}
          isOneMinEnabled
          timelineOptions={TIMELINE_OPTIONS_WITH_1M}
        />
      </DemoBlock>

      <DemoBlock
        title="Detail Legends (isDetailed)"
        description="isDetailed=true → shows the detail legend with current value below the title."
      >
        <ConsumptionLineChart
          tag="t-miner"
          data={DATA_24H}
          isDetailed
          timelineOptions={TIMELINE_OPTIONS}
        />
      </DemoBlock>

      <DemoBlock
        title="Skip Min/Max/Avg Footer"
        description="skipMinMaxAvg=true → footer stats row is hidden."
      >
        <ConsumptionLineChart
          tag="t-miner"
          data={DATA_24H}
          skipMinMaxAvg
          timelineOptions={TIMELINE_OPTIONS}
        />
      </DemoBlock>

      <DemoBlock
        title="Custom Label"
        description="label prop overrides the default 'Total Miner Consumption' legend text."
      >
        <ConsumptionLineChart
          tag="t-miner"
          data={DATA_24H}
          label="Site Power Draw"
          timelineOptions={TIMELINE_OPTIONS}
        />
      </DemoBlock>

      <DemoBlock
        title="Empty State"
        description="No data passed — chart renders the 'No records found' empty state."
      >
        <ConsumptionLineChart tag="t-miner" data={[]} timelineOptions={TIMELINE_OPTIONS} />
      </DemoBlock>

      <DemoBlock
        title="No Timeline Options"
        description="timelineOptions omitted — range selector is hidden, chart uses defaultTimeline."
      >
        <ConsumptionLineChart tag="t-miner" data={DATA_24H} />
      </DemoBlock>
    </div>
  </div>
)
