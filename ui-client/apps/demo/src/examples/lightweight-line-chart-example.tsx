import type { IChartApi } from '@tetherto/mdk-core-ui'
import { ChartContainer, LineChart } from '@tetherto/mdk-core-ui'
import { useRef, useState } from 'react'
import { DemoPageHeader } from '../components/demo-page-header'

const RANGE_OPTIONS = [
  { label: '5 Min', value: '5m' },
  { label: '30 Min', value: '30m' },
  { label: '3 H', value: '3h' },
  { label: '1 D', value: '1d' },
] as const

export const LwLineChartExample = (): JSX.Element => {
  const ref1 = useRef<IChartApi | null>(null)
  const ref2 = useRef<IChartApi | null>(null)
  const ref3 = useRef<IChartApi | null>(null)
  const ref4 = useRef<IChartApi | null>(null)

  const [range, setRange] = useState('5m')

  const [multiSeriesChartData, setMultiSeriesChartData] = useState({
    datasets: [
      {
        label: 'Revenue',
        borderColor: 'red',
        visible: true,
        data: [
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
        ],
      },
      {
        label: 'Overhead',
        borderColor: 'lightblue',
        visible: true,
        data: [
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
        ],
      },
    ],
  })

  const handleToggleDataset = (index: number): void => {
    setMultiSeriesChartData((prev) => ({
      ...prev,
      datasets: prev.datasets.map((ds, i) => {
        return {
          ...ds,
          ...(i === index
            ? {
                visible: !ds.visible,
              }
            : {}),
        }
      }),
    }))
  }

  const legendData = multiSeriesChartData.datasets.map((ds) => ({
    label: ds.label as string,
    color: ds.borderColor,
    hidden: !ds.visible,
  }))

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
              yTicksFormatter={(v) => `$${v}`}
              data={{
                datasets: [
                  {
                    label: 'Revenue',
                    borderColor: 'red',
                    visible: true,
                    data: [
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
                    ],
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
            legendData={legendData}
            onToggleDataset={handleToggleDataset}
          >
            <LineChart
              customLabel="Revenue"
              timeline="5m"
              chartRef={ref2}
              yTicksFormatter={(v) => `$${v}`}
              height={250}
              data={multiSeriesChartData}
            />
          </ChartContainer>
        </section>
        <section>
          <h3>With highlighted value and range selector</h3>
          <ChartContainer
            title="Hashrate"
            highlightedValue={{
              value: 18.3,
              unit: 'PH/s',
            }}
            rangeSelector={{
              options: RANGE_OPTIONS.map((o) => ({ label: o.label, value: o.value })),
              value: range,
              onChange: setRange,
            }}
            footer={
              <span>
                Min {12} PH/s · Max {13} PH/s · Avg {12.3} PH/s
              </span>
            }
          >
            <LineChart
              customLabel="Pool"
              timeline="5m"
              chartRef={ref3}
              yTicksFormatter={(v) => `$${v}`}
              height={250}
              data={{
                datasets: [
                  {
                    label: 'Pool',
                    borderColor: 'red',
                    visible: true,
                    data: [
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
                    ],
                  },
                  {
                    label: 'Miner',
                    borderColor: 'lightblue',
                    visible: true,
                    data: [
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
                    ],
                  },
                ],
              }}
            />
          </ChartContainer>
        </section>
        <section>
          <h3>With points + footer</h3>
          <ChartContainer
            title="Hashrate"
            highlightedValue={{
              value: 18.3,
              unit: 'PH/s',
            }}
            rangeSelector={{
              options: RANGE_OPTIONS.map((o) => ({ label: o.label, value: o.value })),
              value: range,
              onChange: setRange,
            }}
            footer={
              <span>
                Min {12} PH/s · Max {13} PH/s · Avg {12.3} PH/s
              </span>
            }
          >
            <LineChart
              customLabel="Revenue"
              timeline="5m"
              chartRef={ref4}
              yTicksFormatter={(v) => `$${v}`}
              showPointMarkers
              height={250}
              data={{
                datasets: [
                  {
                    label: 'Revenue',
                    borderColor: 'red',
                    visible: true,
                    data: [
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
                    ],
                  },
                  {
                    label: 'Miner',
                    borderColor: 'lightblue',
                    visible: true,
                    data: [
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
                    ],
                  },
                  {
                    label: 'Container',
                    borderColor: 'orange',
                    visible: true,
                    data: [
                      { x: new Date('2019-04-11').valueOf(), y: 8.01 * 2 },
                      { x: new Date('2019-04-12').valueOf(), y: 9.63 * 2 },
                      { x: new Date('2019-04-13').valueOf(), y: 7.64 * 2 },
                      { x: new Date('2019-04-14').valueOf(), y: 8.89 * 2 },
                      { x: new Date('2019-04-15').valueOf(), y: 7.43 * 2 },
                      { x: new Date('2019-04-16').valueOf(), y: 8.01 * 2 },
                      { x: new Date('2019-04-17').valueOf(), y: 9.63 * 2 },
                      { x: new Date('2019-04-18').valueOf(), y: 7.64 * 2 },
                      { x: new Date('2019-04-19').valueOf(), y: 8.89 * 2 },
                      { x: new Date('2019-04-20').valueOf(), y: 7.43 * 2 },
                    ],
                  },
                ],
              }}
            />
          </ChartContainer>
        </section>
      </div>
    </section>
  )
}
