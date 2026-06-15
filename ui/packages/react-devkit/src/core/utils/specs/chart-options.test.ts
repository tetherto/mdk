import { describe, expect, it, vi } from 'vitest'

import {
  buildBarChartData,
  buildBarChartOptions,
  colorWithAlpha,
  computeStats,
  defaultChartOptions,
  getDatasetValues,
  makeBarGradient,
} from '../chart-options'

describe('computeStats', () => {
  it('computes min, max, avg from array', () => {
    expect(computeStats([1, 2, 3, 4, 5])).toEqual({
      min: 1,
      max: 5,
      avg: 3,
    })
  })

  it('handles single value', () => {
    expect(computeStats([42])).toEqual({
      min: 42,
      max: 42,
      avg: 42,
    })
  })

  it('returns zeros for empty array', () => {
    expect(computeStats([])).toEqual({
      min: 0,
      max: 0,
      avg: 0,
    })
  })

  it('handles negative values', () => {
    expect(computeStats([-5, -2, -10])).toEqual({
      min: -10,
      max: -2,
      avg: -5.666666666666667,
    })
  })
})

describe('getDatasetValues', () => {
  it('extracts all numeric values from datasets', () => {
    const datasets = [{ data: [1, 2, null, 3] }, { data: [4, null, 5] }]
    expect(getDatasetValues(datasets)).toEqual([1, 2, 3, 4, 5])
  })

  it('returns empty array for empty datasets', () => {
    expect(getDatasetValues([])).toEqual([])
  })

  it('filters out null values', () => {
    const datasets = [{ data: [null, null, 1, null, 2] }]
    expect(getDatasetValues(datasets)).toEqual([1, 2])
  })
})

describe('colorWithAlpha', () => {
  it('adds alpha to hex color (6 digits)', () => {
    expect(colorWithAlpha('#FF0000', 0.5)).toBe('#FF000080')
  })

  it('adds alpha to hex color (9 digits with existing alpha)', () => {
    expect(colorWithAlpha('#FF0000FF', 0.5)).toBe('#FF000080')
  })

  it('adds alpha to hsl color', () => {
    expect(colorWithAlpha('hsl(0, 100%, 50%)', 0.5)).toBe('hsl(0, 100%, 50% / 0.5)')
  })

  it('adds alpha to rgb color', () => {
    expect(colorWithAlpha('rgb(255, 0, 0)', 0.75)).toBe('rgb(255, 0, 0 / 0.75)')
  })

  it('returns original for non-string input', () => {
    expect(colorWithAlpha(123 as unknown as string, 0.5)).toBe(123)
  })

  it('returns original for unknown format', () => {
    expect(colorWithAlpha('unknown', 0.5)).toBe('unknown')
  })

  it('handles full opacity', () => {
    expect(colorWithAlpha('#00FF00', 1)).toBe('#00FF00ff')
  })

  it('handles zero opacity', () => {
    expect(colorWithAlpha('#0000FF', 0)).toBe('#0000FF00')
  })
})

describe('makeBarGradient', () => {
  it('creates vertical gradient for default indexAxis', () => {
    const mockChart = {
      chartArea: { top: 0, bottom: 100, left: 0, right: 100 },
      ctx: {
        createLinearGradient: vi.fn().mockReturnValue({
          addColorStop: vi.fn(),
        }),
      },
      config: { options: {} },
    }

    const result = makeBarGradient({ chart: mockChart as any }, '#FF0000', {
      top: 0.8,
      bottom: 0.2,
    })

    expect(mockChart.ctx.createLinearGradient).toHaveBeenCalledWith(0, 0, 0, 100)
    expect(result).toHaveProperty('addColorStop')
  })

  it('creates horizontal gradient for horizontal bar chart', () => {
    const mockChart = {
      chartArea: { top: 0, bottom: 100, left: 0, right: 100 },
      ctx: {
        createLinearGradient: vi.fn().mockReturnValue({
          addColorStop: vi.fn(),
        }),
      },
      config: { options: { indexAxis: 'y' } },
    }

    makeBarGradient({ chart: mockChart as any }, '#FF0000')

    expect(mockChart.ctx.createLinearGradient).toHaveBeenCalledWith(0, 0, 100, 0)
  })

  it('returns base color when chartArea is missing', () => {
    const mockChart = {
      chartArea: null,
      ctx: { createLinearGradient: vi.fn() },
      config: { options: {} },
    }

    const result = makeBarGradient({ chart: mockChart as any }, '#FF0000')
    expect(result).toBe('#FF0000')
  })
})

describe('buildBarChartData', () => {
  it('builds datasets from series with explicit labels', () => {
    const input = {
      labels: ['A', 'B', 'C'],
      series: [{ label: 'Series 1', values: [10, 20, 30], color: '#FF0000' }],
    }

    const result = buildBarChartData(input)

    expect(result.labels).toEqual(['A', 'B', 'C'])
    expect(result.datasets).toHaveLength(1)
    expect(result.datasets[0]).toMatchObject({
      type: 'bar',
      label: 'Series 1',
      data: [10, 20, 30],
      borderColor: '#FF0000',
    })
  })

  it('derives labels from object values', () => {
    const input = {
      series: [{ label: 'Series 1', values: { A: 10, B: 20 } }],
    }

    const result = buildBarChartData(input)

    expect(result.labels).toContain('A')
    expect(result.labels).toContain('B')
  })

  it('handles mixed series, lines, and constants', () => {
    const input = {
      labels: ['A', 'B'],
      series: [{ label: 'Bar', values: [10, 20] }],
      lines: [{ label: 'Line', values: [15, 25] }],
      constants: [{ label: 'Threshold', value: 18, color: '#00FF00' }],
    }

    const result = buildBarChartData(input)

    expect(result.datasets).toHaveLength(3)
    expect(result.datasets[0]?.type).toBe('bar')
    expect(result.datasets[1]?.type).toBe('line')
    expect(result.datasets[2]?.type).toBe('line')
    expect(result.datasets[2]?.data).toEqual([18, 18])
  })

  it('handles stacked bars', () => {
    const input = {
      labels: ['A', 'B'],
      series: [
        { label: 'Stack 1', values: [10, 20], stack: 'group1' },
        { label: 'Stack 2', values: [5, 10], stack: 'group1' },
      ],
    }

    const result = buildBarChartData(input)

    expect(result.datasets[0]?.stack).toBe('group1')
    expect(result.datasets[1]?.stack).toBe('group1')
  })

  it('generates numeric labels when no labels provided and values are arrays', () => {
    const input = {
      series: [{ label: 'Series', values: [10, 20, 30] }],
    }

    const result = buildBarChartData(input)

    expect(result.labels).toEqual(['1', '2', '3'])
  })

  it('converts object values to array using labels', () => {
    const input = {
      labels: ['A', 'B', 'C'],
      series: [{ label: 'Series', values: { A: 10, C: 30 } }],
    }

    const result = buildBarChartData(input)

    expect(result.datasets[0]?.data).toEqual([10, null, 30])
  })
})

describe('buildBarChartOptions', () => {
  it('builds default vertical bar chart options', () => {
    const options = buildBarChartOptions()

    expect(options.indexAxis).toBe('x')
    expect(options.responsive).toBe(true)
    expect(options.maintainAspectRatio).toBe(false)
  })

  it('builds horizontal bar chart options', () => {
    const options = buildBarChartOptions({ isHorizontal: true })

    expect(options.indexAxis).toBe('y')
  })

  it('enables stacking when isStacked is true', () => {
    const options = buildBarChartOptions({ isStacked: true })

    expect((options.scales as any).x.stacked).toBe(true)
    expect((options.scales as any).y.stacked).toBe(true)
  })

  it('adds right Y-axis when yRightTicksFormatter provided', () => {
    const formatter = (v: number) => `${v}%`
    const options = buildBarChartOptions({ yRightTicksFormatter: formatter })

    expect((options.scales as any).y1).toBeDefined()
    expect((options.scales as any).y1.position).toBe('right')
  })

  it('applies custom legend settings', () => {
    const options = buildBarChartOptions({
      legendPosition: 'bottom',
      legendAlign: 'center',
      showLegend: false,
    })

    expect((options.plugins as any).legend.display).toBe(false)
    expect((options.plugins as any).legend.position).toBe('bottom')
    expect((options.plugins as any).legend.align).toBe('center')
  })

  it('uses custom y-axis formatter in tooltip', () => {
    const formatter = (v: number) => `$${v}`
    const options = buildBarChartOptions({ yTicksFormatter: formatter })

    const tooltipCallbacks = (options.plugins as any).tooltip.callbacks
    const mockCtx = {
      dataset: { label: 'Test' },
      parsed: { y: 100, x: 0 },
    }

    expect(tooltipCallbacks.label(mockCtx)).toBe('Test: $100')
  })

  it('returns empty label string when tooltip parsed value is null', () => {
    const options = buildBarChartOptions()

    const tooltipCallbacks = (options.plugins as any).tooltip.callbacks
    const mockCtx = {
      dataset: { label: 'Empty' },
      parsed: { y: null, x: null },
    }

    expect(tooltipCallbacks.label(mockCtx)).toBe('Empty: ')
  })

  it('uses right axis formatter for y1 datasets in tooltip', () => {
    const leftFormatter = (v: number) => `${v} units`
    const rightFormatter = (v: number) => `${v}%`
    const options = buildBarChartOptions({
      yTicksFormatter: leftFormatter,
      yRightTicksFormatter: rightFormatter,
    })

    const tooltipCallbacks = (options.plugins as any).tooltip.callbacks
    const mockCtx = {
      dataset: { label: 'Right', yAxisID: 'y1' },
      parsed: { y: 50, x: 0 },
    }

    expect(tooltipCallbacks.label(mockCtx)).toBe('Right: 50%')
  })
})

describe('defaultChartOptions – buildLegendLabels', () => {
  const generateLabels = defaultChartOptions.plugins.legend.labels.generateLabels

  it('builds legend items for visible datasets', () => {
    const mockChart = {
      data: {
        datasets: [
          { label: 'Series A', borderColor: '#FF0000', borderWidth: 2 },
          { label: 'Series B', borderColor: '#00FF00' },
        ],
      },
      getDatasetMeta: vi.fn().mockReturnValue({ hidden: false }),
    }

    const labels = generateLabels(mockChart as any)

    expect(labels).toHaveLength(2)
    expect(labels[0]).toMatchObject({
      text: 'Series A',
      strokeStyle: '#FF0000',
      hidden: false,
      datasetIndex: 0,
    })
    expect(labels[0]?.fontColor).toBe('rgba(255, 255, 255, 0.7)')
  })

  it('dims hidden datasets with reduced opacity', () => {
    const mockChart = {
      data: {
        datasets: [{ label: 'Hidden', borderColor: '#0000FF' }],
      },
      getDatasetMeta: vi.fn().mockReturnValue({ hidden: true }),
    }

    const labels = generateLabels(mockChart as any)

    expect(labels).toHaveLength(1)
    // fontColor should be dimmed (opacity 0.7 * 0.3 = 0.21)
    expect(labels[0]?.fontColor).toContain('rgba(255, 255, 255,')
    expect(labels[0]?.fontColor).not.toBe('rgba(255, 255, 255, 0.7)')
  })

  it('falls back to #888 when dataset has no border or background color', () => {
    const mockChart = {
      data: {
        datasets: [{ label: 'No Color' }],
      },
      getDatasetMeta: vi.fn().mockReturnValue({ hidden: false }),
    }

    const labels = generateLabels(mockChart as any)

    expect(labels[0]?.strokeStyle).toContain('#888')
  })

  it('handles empty datasets array', () => {
    const mockChart = {
      data: { datasets: [] },
      getDatasetMeta: vi.fn(),
    }

    expect(generateLabels(mockChart as any)).toEqual([])
  })
})
