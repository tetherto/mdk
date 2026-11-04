import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LineChart } from '../index'

const chart = vi.hoisted(() => {
  const series: Array<{ setData: ReturnType<typeof vi.fn> }> = []
  const timeScale = {
    fitContent: vi.fn(),
    setVisibleLogicalRange: vi.fn(),
    subscribeVisibleLogicalRangeChange: vi.fn(),
    unsubscribeVisibleLogicalRangeChange: vi.fn(),
  }
  const api = {
    addLineSeries: vi.fn(() => {
      const s = { setData: vi.fn(), applyOptions: vi.fn() }
      series.push(s)
      return s
    }),
    removeSeries: vi.fn(),
    applyOptions: vi.fn(),
    timeScale: () => timeScale,
    priceScale: () => ({ applyOptions: vi.fn() }),
    subscribeCrosshairMove: vi.fn(),
    unsubscribeCrosshairMove: vi.fn(),
  }
  return { series, timeScale, api, createChart: vi.fn(() => api) }
})

vi.mock('lightweight-charts', () => ({ createChart: chart.createChart }))

const HOUR = 3_600_000
const points = Array.from({ length: 24 }, (_, i) => ({
  x: 1_700_000_000_000 + i * HOUR,
  y: 70 + i,
}))
// Built once and never changed, like a demo fixture or a one-shot fetch.
const data = { datasets: [{ label: 'Hashrate', borderColor: '#59E8E8', data: points }] }

describe('lineChart', () => {
  beforeEach(() => {
    chart.series.length = 0
    vi.clearAllMocks()
  })

  it('draws data that is already set when lightweight-charts finishes loading', async () => {
    render(<LineChart data={data} timeline="1D" />)

    await waitFor(() => expect(chart.series[0]?.setData).toHaveBeenCalled())
    const drawn = chart.series[0]!.setData.mock.calls.at(-1)![0] as Array<{
      time: number
      value: number
    }>
    expect(drawn).toHaveLength(24)
    expect(drawn[0]).toEqual({ time: points[0]!.x / 1000, value: 70 })
  })

  it('subscribes to visible-range changes once the chart exists', async () => {
    render(<LineChart data={data} />)

    await waitFor(() =>
      expect(chart.timeScale.subscribeVisibleLogicalRangeChange).toHaveBeenCalled(),
    )
  })

  it('draws each dataset with its lineStyle, solid by default', async () => {
    const nominal = {
      label: 'Nominal',
      borderColor: '#FFFFFF',
      lineStyle: 'dashed' as const,
      data: points,
    }
    render(<LineChart data={{ datasets: [...data.datasets, nominal] }} />)

    await waitFor(() => expect(chart.api.addLineSeries).toHaveBeenCalledTimes(2))
    expect(chart.api.addLineSeries).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ lineStyle: 0 }),
    )
    expect(chart.api.addLineSeries).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ lineStyle: 2 }),
    )
  })

  it('updates lineStyle on an existing series', async () => {
    const { rerender } = render(<LineChart data={data} />)
    await waitFor(() => expect(chart.series).toHaveLength(1))

    const dotted = { datasets: [{ ...data.datasets[0]!, lineStyle: 'dotted' as const }] }
    rerender(<LineChart data={dotted} />)

    expect(chart.api.addLineSeries).toHaveBeenCalledTimes(1)
    expect(chart.series[0]!.applyOptions).toHaveBeenCalledWith(
      expect.objectContaining({ lineStyle: 1 }),
    )
  })

  it('passes priceFormat to every series as a price format', async () => {
    render(<LineChart data={data} priceFormat={{ minMove: 0.001 }} />)

    await waitFor(() =>
      expect(chart.api.addLineSeries).toHaveBeenCalledWith(
        expect.objectContaining({ priceFormat: { type: 'price', minMove: 0.001 } }),
      ),
    )
  })

  it('uses the library default price format without priceFormat', async () => {
    render(<LineChart data={data} />)

    await waitFor(() =>
      expect(chart.api.addLineSeries).toHaveBeenCalledWith(
        expect.objectContaining({ priceFormat: { type: 'price', precision: 2, minMove: 0.01 } }),
      ),
    )
  })

  it('resets an existing series to the default price format when priceFormat is removed', async () => {
    const { rerender } = render(<LineChart data={data} priceFormat={{ minMove: 0.001 }} />)
    await waitFor(() => expect(chart.series).toHaveLength(1))

    rerender(<LineChart data={data} />)

    expect(chart.api.addLineSeries).toHaveBeenCalledTimes(1)
    expect(chart.series[0]!.applyOptions).toHaveBeenLastCalledWith(
      expect.objectContaining({ priceFormat: { type: 'price', precision: 2, minMove: 0.01 } }),
    )
  })
})
