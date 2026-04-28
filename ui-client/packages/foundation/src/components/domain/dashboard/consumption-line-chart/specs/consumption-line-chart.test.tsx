import { UNITS } from '@tetherto/mdk-core-ui'
import '@testing-library/jest-dom'
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DATE_RANGE } from '../../../../../constants'
import { ConsumptionLineChart } from '../consumption-line-chart'
import { buildConsumptionData } from '../consumption-line-chart-helper'

vi.mock('../../../line-chart-card', () => ({
  LineChartCard: vi.fn(
    ({
      title,
      data,
      timelineOptions,
      timeline,
      defaultTimeline,
      detailLegends,
      shouldResetZoom,
      onTimelineChange,
    }) => (
      <div data-testid="line-chart-card">
        <span data-testid="title">{title}</span>
        <span data-testid="default-timeline">{defaultTimeline}</span>
        <span data-testid="timeline">{timeline}</span>
        <span data-testid="detail-legends">{String(detailLegends)}</span>
        <span data-testid="should-reset-zoom">{String(shouldResetZoom)}</span>
        <span data-testid="has-timeline-options">{String(!!timelineOptions)}</span>
        <span data-testid="has-data">{String(!!data)}</span>
        <span data-testid="has-on-timeline-change">{String(!!onTimelineChange)}</span>
      </div>
    ),
  ),
}))

vi.mock('../consumption-line-chart-helper', () => ({
  buildConsumptionData: vi.fn(() => ({
    datasets: [{ label: 'Total Miner Consumption', data: [], borderColor: '#00bfff' }],
    highlightedValue: { value: 5, unit: UNITS.POWER_KW },
    yTicksFormatter: (v: number) => `${v} ${UNITS.POWER_W}`,
  })),
}))

const mockedBuildConsumptionData = buildConsumptionData as ReturnType<typeof vi.fn>

describe('ConsumptionLineChart', () => {
  const defaultData = [{ ts: 1000, power_w_sum_aggr: 5000 }]

  describe('rendering', () => {
    it('renders the LineChartCard', () => {
      const { getByTestId } = render(<ConsumptionLineChart />)
      expect(getByTestId('line-chart-card')).toBeInTheDocument()
    })

    it('passes the POWER_CONSUMPTION chart title', () => {
      const { getByTestId } = render(<ConsumptionLineChart />)
      expect(getByTestId('title').textContent).toBe('Power Consumption')
    })

    it('always passes shouldResetZoom as true', () => {
      const { getByTestId } = render(<ConsumptionLineChart />)
      expect(getByTestId('should-reset-zoom').textContent).toBe('true')
    })
  })

  describe('defaultTimeline', () => {
    it('uses "5m" when isOneMinEnabled is false', () => {
      const { getByTestId } = render(<ConsumptionLineChart isOneMinEnabled={false} />)
      expect(getByTestId('default-timeline').textContent).toBe('5m')
    })

    it('uses "1m" when isOneMinEnabled is true', () => {
      const { getByTestId } = render(<ConsumptionLineChart isOneMinEnabled />)
      expect(getByTestId('default-timeline').textContent).toBe(DATE_RANGE.M1)
    })

    it('prefers the provided defaultTimeline over isOneMinEnabled', () => {
      const { getByTestId } = render(<ConsumptionLineChart isOneMinEnabled defaultTimeline="24h" />)
      expect(getByTestId('default-timeline').textContent).toBe('24h')
    })
  })

  describe('controlled timeline', () => {
    it('forwards the timeline prop to LineChartCard', () => {
      const { getByTestId } = render(<ConsumptionLineChart timeline="3h" />)
      expect(getByTestId('timeline').textContent).toBe('3h')
    })
  })

  describe('detailLegends', () => {
    it('is falsy by default', () => {
      const { getByTestId } = render(<ConsumptionLineChart />)
      expect(getByTestId('detail-legends').textContent).not.toBe('true')
    })

    it('forwards isDetailed=true as detailLegends', () => {
      const { getByTestId } = render(<ConsumptionLineChart isDetailed />)
      expect(getByTestId('detail-legends').textContent).toBe('true')
    })
  })

  describe('timelineOptions', () => {
    it('forwards timelineOptions when provided', () => {
      const options = [{ label: '5 Min', value: DATE_RANGE.M5 }]
      const { getByTestId } = render(<ConsumptionLineChart timelineOptions={options} />)
      expect(getByTestId('has-timeline-options').textContent).toBe('true')
    })
  })

  describe('onTimelineChange', () => {
    it('forwards the callback to LineChartCard', () => {
      const handler = vi.fn()
      const { getByTestId } = render(<ConsumptionLineChart onTimelineChange={handler} />)
      expect(getByTestId('has-on-timeline-change').textContent).toBe('true')
    })
  })

  describe('buildConsumptionData integration', () => {
    it('calls buildConsumptionData with the correct arguments', () => {
      mockedBuildConsumptionData.mockClear()

      render(
        <ConsumptionLineChart
          tag="container-c1"
          data={defaultData}
          skipMinMaxAvg
          powerAttribute="custom_power"
          totalTransformerConsumption
          rawConsumptionW={9000}
          label="My Chart"
        />,
      )

      expect(mockedBuildConsumptionData).toHaveBeenCalledWith({
        data: defaultData,
        tag: 'container-c1',
        skipMinMaxAvg: true,
        powerAttribute: 'custom_power',
        totalTransformerConsumption: true,
        rawConsumptionW: 9000,
        label: 'My Chart',
      })
    })

    it('passes the result of buildConsumptionData as data to LineChartCard', () => {
      const { getByTestId } = render(<ConsumptionLineChart />)
      expect(getByTestId('has-data').textContent).toBe('true')
    })

    it('does not re-call buildConsumptionData on unrelated re-renders', () => {
      mockedBuildConsumptionData.mockClear()
      const { rerender } = render(<ConsumptionLineChart tag="t-miner" data={defaultData} />)
      rerender(<ConsumptionLineChart tag="t-miner" data={defaultData} />)
      // useMemo with same deps — should only call once
      expect(mockedBuildConsumptionData).toHaveBeenCalledTimes(1)
    })

    it('re-calls buildConsumptionData when data changes', () => {
      mockedBuildConsumptionData.mockClear()
      const { rerender } = render(<ConsumptionLineChart tag="t-miner" data={defaultData} />)
      rerender(<ConsumptionLineChart tag="t-miner" data={[{ ts: 2000, power_w_sum_aggr: 1000 }]} />)
      expect(mockedBuildConsumptionData).toHaveBeenCalledTimes(2)
    })

    it('re-calls buildConsumptionData when tag changes', () => {
      mockedBuildConsumptionData.mockClear()
      const { rerender } = render(<ConsumptionLineChart tag="t-miner" data={defaultData} />)
      rerender(<ConsumptionLineChart tag="container-c1" data={defaultData} />)
      expect(mockedBuildConsumptionData).toHaveBeenCalledTimes(2)
    })
  })
})
