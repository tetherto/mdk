import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { LineChartCard } from '../index'
import type { LineChartCardData } from '../types'

// The card's own job here is the mapping it hands to `ChartContainer`, so the
// container stands in as a plain list of buttons built from `rangeSelector`.
vi.mock('@primitives', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@primitives')>()
  return {
    ...actual,
    ChartContainer: vi.fn(({ rangeSelector, children }) => (
      <div data-testid="chart-container">
        {rangeSelector?.options.map(
          (option: { label: string; value: string; disabled?: boolean }) => (
            <button
              key={option.value}
              data-testid={`range-${option.value}`}
              disabled={option.disabled}
              onClick={() => rangeSelector.onChange(option.value)}
            >
              {option.label}
            </button>
          ),
        )}
        {children}
      </div>
    )),
    LineChart: vi.fn(() => <div data-testid="line-chart" />),
  }
})

const data: LineChartCardData = {
  datasets: [
    {
      label: 'Hashrate',
      borderColor: '#00ff00',
      data: [
        { x: 1724299140000, y: 1 },
        { x: 1724299200000, y: 2 },
      ],
    },
  ],
}

const timelineOptions = [
  { label: '5 Min', value: '5m' },
  { label: '1 D', value: '1D', disabled: true },
]

describe('LineChartCard range selector', () => {
  it('forwards a disabled timeline option to the range selector', () => {
    render(<LineChartCard data={data} timelineOptions={timelineOptions} />)

    expect(screen.getByTestId('range-1D')).toBeDisabled()
    expect(screen.getByTestId('range-5m')).toBeEnabled()
  })

  it('leaves an option enabled when it does not declare disabled', () => {
    render(
      <LineChartCard
        data={data}
        timelineOptions={[
          { label: '5 Min', value: '5m' },
          { label: '1 D', value: '1D' },
        ]}
      />,
    )

    expect(screen.getByTestId('range-5m')).toBeEnabled()
    expect(screen.getByTestId('range-1D')).toBeEnabled()
  })

  it('keeps label and value paired when mapping the options', () => {
    const onTimelineChange = vi.fn()
    render(
      <LineChartCard
        data={data}
        timelineOptions={timelineOptions}
        onTimelineChange={onTimelineChange}
      />,
    )

    expect(screen.getByTestId('range-5m')).toHaveTextContent('5 Min')

    fireEvent.click(screen.getByTestId('range-5m'))

    expect(onTimelineChange).toHaveBeenCalledWith('5m')
  })
})
