import type { IChartApi } from '@tetherto/mdk-react-devkit/core'
import { ChartContainer, CURRENCY, LineChart, UNITS } from '@tetherto/mdk-react-devkit/core'
import { type Dispatch, type JSX, type SetStateAction, useCallback, useRef, useState } from 'react'
import { DemoPageHeader } from '../components/demo-page-header'

const RANGE_OPTIONS = [
  { label: '5 Min', value: '5m' },
  { label: '30 Min', value: '30m' },
  { label: '3 H', value: '3h' },
  { label: '1 D', value: '1d' },
] as const

const REVENUE_SAMPLE_POINTS = [
  { x: new Date('2019-04-11').valueOf(), y: 80.01 },
  { x: new Date('2019-04-12').valueOf(), y: 96.63 },
  { x: new Date('2019-04-13').valueOf(), y: 76.64 },
  { x: new Date('2019-04-14').valueOf(), y: 81.89 },
  { x: new Date('2019-04-15').valueOf(), y: 74.43 },
  { x: new Date('2019-04-16').valueOf(), y: 80.01 },
  { x: new Date('2019-04-17').valueOf(), y: 96.63 },
  { x: new Date('2019-04-18').valueOf(), y: 76.64 },
  { x: new Date('2019-04-19').valueOf(), y: 81.89 },
  { x: new Date('2019-04-20').valueOf(), y: 74.43 },
]

const OVERHEAD_SAMPLE_POINTS = [
  { x: new Date('2019-04-11').valueOf(), y: 8.01 },
  { x: new Date('2019-04-12').valueOf(), y: 9.63 },
  { x: new Date('2019-04-13').valueOf(), y: 7.64 },
  { x: new Date('2019-04-14').valueOf(), y: 8.89 },
  { x: new Date('2019-04-15').valueOf(), y: 7.43 },
  { x: new Date('2019-04-16').valueOf(), y: 8.01 },
  { x: new Date('2019-04-17').valueOf(), y: 9.63 },
  { x: new Date('2019-04-18').valueOf(), y: 7.64 },
  { x: new Date('2019-04-19').valueOf(), y: 8.89 },
  { x: new Date('2019-04-20').valueOf(), y: 7.43 },
]

const HASHRATE_MIN_MAX_AVG = {
  min: `12 ${UNITS.HASHRATE_PH_S}`,
  max: `13 ${UNITS.HASHRATE_PH_S}`,
  avg: `12.3 ${UNITS.HASHRATE_PH_S}`,
}

const REVENUE_MIN_MAX_AVG = {
  min: `${CURRENCY.USD}74.43`,
  max: `${CURRENCY.USD}96.63`,
  avg: `${CURRENCY.USD}80.4`,
}

type LineDataset = {
  label: string
  borderColor: string
  visible: boolean
  data: Array<{ x: number; y: number }>
}

type LineChartData = { datasets: LineDataset[] }

const toLegendData = (datasets: LineDataset[]) =>
  datasets.map((ds) => ({
    label: ds.label,
    color: ds.borderColor,
    hidden: !ds.visible,
  }))

export const LwLineChartExample = (): JSX.Element => {
  const ref1 = useRef<IChartApi | null>(null)
  const ref2 = useRef<IChartApi | null>(null)
  const ref3 = useRef<IChartApi | null>(null)
  const ref4 = useRef<IChartApi | null>(null)

  const [range, setRange] = useState('5m')

  const [multiSeriesChartData, setMultiSeriesChartData] = useState<LineChartData>({
    datasets: [
      {
        label: 'Revenue',
        borderColor: 'red',
        visible: true,
        data: REVENUE_SAMPLE_POINTS,
      },
      {
        label: 'Overhead',
        borderColor: 'lightblue',
        visible: true,
        data: OVERHEAD_SAMPLE_POINTS,
      },
    ],
  })

  const [hashrateRangeChartData, setHashrateRangeChartData] = useState<LineChartData>({
    datasets: [
      {
        label: 'Pool',
        borderColor: 'red',
        visible: true,
        data: REVENUE_SAMPLE_POINTS,
      },
      {
        label: 'Miner',
        borderColor: 'lightblue',
        visible: true,
        data: OVERHEAD_SAMPLE_POINTS,
      },
    ],
  })

  const [hashratePointsChartData, setHashratePointsChartData] = useState<LineChartData>({
    datasets: [
      {
        label: 'Revenue',
        borderColor: 'red',
        visible: true,
        data: REVENUE_SAMPLE_POINTS,
      },
      {
        label: 'Miner',
        borderColor: 'lightblue',
        visible: true,
        data: OVERHEAD_SAMPLE_POINTS,
      },
      {
        label: 'Container',
        borderColor: 'orange',
        visible: true,
        data: OVERHEAD_SAMPLE_POINTS.map((p) => ({ x: p.x, y: p.y * 2 })),
      },
    ],
  })

  const toggleDataset = useCallback(
    (setData: Dispatch<SetStateAction<LineChartData>>, index: number) => {
      setData((prev) => ({
        datasets: prev.datasets.map((ds, i) =>
          i === index ? { ...ds, visible: !ds.visible } : ds,
        ),
      }))
    },
    [],
  )

  return (
    <section className="demo-section">
      <DemoPageHeader title="Line Chart" />
      <p className="demo-section__resize-hint">
        ← Resize the window horizontally to see charts adapt →
      </p>
      <div className="demo-section__charts demo-section__charts--2-col">
        <section>
          <h3>Basic</h3>
          <ChartContainer title="Revenue over time">
            <LineChart
              customLabel="Revenue"
              timeline="5m"
              chartRef={ref1}
              yTicksFormatter={(value) => `${CURRENCY.USD}${value}`}
              data={{
                datasets: [
                  {
                    label: 'Revenue',
                    borderColor: 'red',
                    visible: true,
                    data: REVENUE_SAMPLE_POINTS,
                  },
                ],
              }}
            />
          </ChartContainer>
        </section>
        <section>
          <h3>Multi Series with legend</h3>
          <ChartContainer
            title="Revenue over time"
            legendData={toLegendData(multiSeriesChartData.datasets)}
            onToggleDataset={(index) => toggleDataset(setMultiSeriesChartData, index)}
            minMaxAvg={REVENUE_MIN_MAX_AVG}
          >
            <LineChart
              customLabel="Revenue"
              timeline="5m"
              height={250}
              chartRef={ref2}
              data={multiSeriesChartData}
              yTicksFormatter={(value) => `${CURRENCY.USD}${value}`}
            />
          </ChartContainer>
        </section>
        <section>
          <h3>With highlighted value and range selector</h3>
          <ChartContainer
            title="Hashrate"
            highlightedValue={{
              value: 18.3,
              unit: UNITS.HASHRATE_PH_S,
            }}
            legendData={toLegendData(hashrateRangeChartData.datasets)}
            onToggleDataset={(index) => toggleDataset(setHashrateRangeChartData, index)}
            minMaxAvg={HASHRATE_MIN_MAX_AVG}
            rangeSelector={{
              options: RANGE_OPTIONS.map((o) => ({ label: o.label, value: o.value })),
              value: range,
              onChange: setRange,
            }}
          >
            <LineChart
              customLabel="Pool"
              timeline="5m"
              chartRef={ref3}
              yTicksFormatter={(value) => `${CURRENCY.USD}${value}`}
              height={250}
              data={hashrateRangeChartData}
            />
          </ChartContainer>
        </section>
        <section>
          <h3>With points + footer</h3>
          <ChartContainer
            title="Hashrate"
            highlightedValue={{
              value: 18.3,
              unit: UNITS.HASHRATE_PH_S,
            }}
            legendData={toLegendData(hashratePointsChartData.datasets)}
            onToggleDataset={(index) => toggleDataset(setHashratePointsChartData, index)}
            minMaxAvg={HASHRATE_MIN_MAX_AVG}
            rangeSelector={{
              options: RANGE_OPTIONS.map((o) => ({ label: o.label, value: o.value })),
              value: range,
              onChange: setRange,
            }}
          >
            <LineChart
              customLabel="Revenue"
              timeline="5m"
              chartRef={ref4}
              yTicksFormatter={(value) => `${CURRENCY.USD}${value}`}
              showPointMarkers
              height={250}
              data={hashratePointsChartData}
            />
          </ChartContainer>
        </section>
      </div>
    </section>
  )
}
