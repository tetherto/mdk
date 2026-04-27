import { describe, expect, it } from 'vitest'

import {
  autoscaleProvider,
  buildTooltipHTML,
  getTooltipPosition,
  getVisibleDataPointsForTimeline,
} from '../line-chart.utils'

describe('getTooltipPosition', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'innerWidth', { value: 1000, writable: true })
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true })
  })

  it('positions tooltip to the right of cursor by default', () => {
    const result = getTooltipPosition(100, 100, 200, 100)

    expect(result.left).toBeGreaterThan(100)
    expect(result.top).toBe(110)
  })

  it('positions tooltip to the left when not enough space on right', () => {
    const result = getTooltipPosition(900, 100, 200, 100, 10)

    expect(result.left).toBeLessThan(900)
  })

  it('positions tooltip above cursor when not enough space below', () => {
    const result = getTooltipPosition(100, 750, 200, 100, 10)

    expect(result.top).toBeLessThan(750)
  })

  it('constrains tooltip to left edge', () => {
    const result = getTooltipPosition(10, 100, 200, 100, 5)

    expect(result.left).toBeGreaterThanOrEqual(5)
  })

  it('constrains tooltip to right edge', () => {
    const result = getTooltipPosition(990, 100, 300, 100, 5)

    expect(result.left + 300).toBeLessThanOrEqual(1000)
  })

  it('constrains tooltip to top edge', () => {
    const result = getTooltipPosition(100, 10, 200, 100, 5)

    expect(result.top).toBeGreaterThanOrEqual(5)
  })

  it('centers tooltip when too wide for viewport', () => {
    const result = getTooltipPosition(100, 100, 1200, 100, 10)

    expect(result.left).toBeGreaterThanOrEqual(10)
  })

  it('uses custom offset', () => {
    const customOffset = 20
    const result = getTooltipPosition(100, 100, 200, 100, customOffset)

    expect(result.left).toBe(100 + customOffset)
  })
})

describe('autoscaleProvider', () => {
  it('returns null when original returns null', () => {
    const original = () => null
    const provider = autoscaleProvider(false)

    expect(provider(original)).toBe(null)
  })

  it('adds padding when min equals max (integer)', () => {
    const original = () => ({
      priceRange: { minValue: 10, maxValue: 10 },
    })
    const provider = autoscaleProvider(false)

    const result = provider(original)

    expect(result?.priceRange.minValue).toBeLessThan(10)
    expect(result?.priceRange.maxValue).toBeGreaterThan(10)
  })

  it('adds padding when min equals max (float)', () => {
    const original = () => ({
      priceRange: { minValue: 10.5, maxValue: 10.5 },
    })
    const provider = autoscaleProvider(false)

    const result = provider(original)

    expect(result?.priceRange.minValue).toBeLessThan(10.5)
    expect(result?.priceRange.maxValue).toBeGreaterThan(10.5)
  })

  it('sets min to 0 when beginAtZero is true', () => {
    const original = () => ({
      priceRange: { minValue: 5, maxValue: 10 },
    })
    const provider = autoscaleProvider(true)

    const result = provider(original)

    expect(result?.priceRange.minValue).toBe(0)
    expect(result?.priceRange.maxValue).toBe(10)
  })

  it('keeps negative min when beginAtZero is true', () => {
    const original = () => ({
      priceRange: { minValue: -5, maxValue: 10 },
    })
    const provider = autoscaleProvider(true)

    const result = provider(original)

    expect(result?.priceRange.minValue).toBe(-5)
  })

  it('adds margins to result', () => {
    const original = () => ({
      priceRange: { minValue: 5, maxValue: 10 },
    })
    const provider = autoscaleProvider(false)

    const result = provider(original)

    expect(result?.margins).toBeDefined()
    expect(result?.margins?.above).toBe(0.3)
    expect(result?.margins?.below).toBe(0.2)
  })

  it('preserves range when not flat', () => {
    const original = () => ({
      priceRange: { minValue: 0, maxValue: 100 },
    })
    const provider = autoscaleProvider(false)

    const result = provider(original)

    expect(result?.priceRange.minValue).toBe(0)
    expect(result?.priceRange.maxValue).toBe(100)
  })
})

describe('buildTooltipHTML', () => {
  it('builds tooltip HTML for visible datasets', () => {
    const mockSeries = new Map() as any
    const mockDataset = {
      label: 'Series 1',
      visible: true,
      borderColor: '#FF0000',
    }
    const seriesToDatasetMap = new Map()
    const mockSeriesApi = {} as any

    seriesToDatasetMap.set(mockSeriesApi, mockDataset)
    mockSeries.set(mockSeriesApi, { time: 1234567890, value: 42 })

    const result = buildTooltipHTML({
      seriesData: mockSeries,
      seriesToDatasetMap,
    })

    expect(result).toContain('Series 1')
    expect(result).toContain('42')
    expect(result).toContain('#FF0000')
  })

  it('skips invisible datasets', () => {
    const mockSeries = new Map() as any
    const mockDataset = {
      label: 'Invisible',
      visible: false,
      borderColor: '#FF0000',
    }
    const seriesToDatasetMap = new Map()
    const mockSeriesApi = {} as any

    seriesToDatasetMap.set(mockSeriesApi, mockDataset)
    mockSeries.set(mockSeriesApi, { time: 1234567890, value: 42 })

    const result = buildTooltipHTML({
      seriesData: mockSeries,
      seriesToDatasetMap,
    })

    expect(result).not.toContain('Invisible')
  })

  it('uses custom yTicksFormatter', () => {
    const mockSeries = new Map() as any
    const mockDataset = {
      label: 'Series',
      visible: true,
      borderColor: '#00FF00',
    }
    const seriesToDatasetMap = new Map()
    const mockSeriesApi = {} as any

    seriesToDatasetMap.set(mockSeriesApi, mockDataset)
    mockSeries.set(mockSeriesApi, { time: 1234567890, value: 123.456 })

    const result = buildTooltipHTML({
      seriesData: mockSeries,
      seriesToDatasetMap,
      yTicksFormatter: (v) => v.toFixed(2),
    })

    expect(result).toContain('123.46')
  })

  it('appends unit to value', () => {
    const mockSeries = new Map() as any
    const mockDataset = {
      label: 'Hashrate',
      visible: true,
      borderColor: '#0000FF',
    }
    const seriesToDatasetMap = new Map()
    const mockSeriesApi = {} as any

    seriesToDatasetMap.set(mockSeriesApi, mockDataset)
    mockSeries.set(mockSeriesApi, { time: 1234567890, value: 100 })

    const result = buildTooltipHTML({
      seriesData: mockSeries,
      seriesToDatasetMap,
      unit: 'TH/s',
    })

    expect(result).toContain('100 TH/s')
  })

  it('shows date when showDateInTooltip is true', () => {
    const mockSeries = new Map() as any
    const mockDataset = {
      label: 'Series',
      visible: true,
      borderColor: '#FF00FF',
    }
    const seriesToDatasetMap = new Map()
    const mockSeriesApi = {} as any

    seriesToDatasetMap.set(mockSeriesApi, mockDataset)
    mockSeries.set(mockSeriesApi, { time: 1704067200, value: 50 })

    const result = buildTooltipHTML({
      seriesData: mockSeries,
      seriesToDatasetMap,
      showDateInTooltip: true,
    })

    expect(result).toContain('01-01-2024')
  })

  it('returns no data message when no visible series', () => {
    const result = buildTooltipHTML({
      seriesData: new Map(),
      seriesToDatasetMap: new Map(),
    })

    expect(result).toContain('No data available')
  })

  it('uses customLabel when provided', () => {
    const mockSeries = new Map() as any
    const mockDataset = {
      visible: true,
      borderColor: '#FFFF00',
    }
    const seriesToDatasetMap = new Map()
    const mockSeriesApi = {} as any

    seriesToDatasetMap.set(mockSeriesApi, mockDataset)
    mockSeries.set(mockSeriesApi, { time: 1234567890, value: 75 })

    const result = buildTooltipHTML({
      seriesData: mockSeries,
      seriesToDatasetMap,
      customLabel: 'Custom Label',
    })

    expect(result).toContain('Custom Label')
  })

  it('handles timestamp as object', () => {
    const mockSeries = new Map() as any
    const mockDataset = {
      label: 'Series',
      visible: true,
      borderColor: '#FF0000',
    }
    const seriesToDatasetMap = new Map()
    const mockSeriesApi = {} as any

    seriesToDatasetMap.set(mockSeriesApi, mockDataset)
    mockSeries.set(mockSeriesApi, { time: { timestamp: 1704067200 }, value: 100 })

    const result = buildTooltipHTML({
      seriesData: mockSeries,
      seriesToDatasetMap,
      showDateInTooltip: true,
    })

    expect(result).toContain('01-01-2024')
  })
})

describe('getVisibleDataPointsForTimeline', () => {
  it('returns correct count for known timeline', () => {
    expect(getVisibleDataPointsForTimeline('1m')).toBe(15)
    expect(getVisibleDataPointsForTimeline('5m')).toBe(12)
    expect(getVisibleDataPointsForTimeline('30m')).toBe(12)
    expect(getVisibleDataPointsForTimeline('3h')).toBe(12)
    expect(getVisibleDataPointsForTimeline('1D')).toBe(14)
  })

  it('returns default 24 for unknown timeline', () => {
    expect(getVisibleDataPointsForTimeline('1w')).toBe(24)
    expect(getVisibleDataPointsForTimeline('custom')).toBe(24)
  })
})
