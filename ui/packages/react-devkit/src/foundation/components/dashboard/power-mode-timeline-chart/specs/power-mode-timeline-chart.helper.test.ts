import { describe, expect, it, vi } from 'vitest'
import {
  getCombinedPowerModeTimelineByMiner,
  getPowerModeTimelineChartData,
  getPowerModeTimelineDatasetObject,
  transformToTimelineChartData,
} from '../power-mode-timeline-chart.helper'

vi.mock('date-fns-tz', () => ({
  getTimezoneOffset: vi.fn((timezone: string) => {
    if (timezone === 'Africa/Algiers') return 3600000
    if (timezone === 'America/New_York') return -18000000
    return 0
  }),
}))

describe('getCombinedPowerModeTimelineByMiner', () => {
  it('should return an empty object when no data is provided', () => {
    const result = getCombinedPowerModeTimelineByMiner([])
    expect(result).toEqual({})
  })

  it('should correctly combine consecutive entries with the same power mode for the same miner', () => {
    const data = [
      {
        ts: 1724299140000,
        power_mode_group_aggr: { 'm221-gabbani-1-miner1': 'normal' },
        status_group_aggr: { 'm221-gabbani-1-miner1': 'mining' },
      },
      {
        ts: 1724299240000,
        power_mode_group_aggr: { 'm221-gabbani-1-miner1': 'normal' },
        status_group_aggr: { 'm221-gabbani-1-miner1': 'mining' },
      },
    ]

    const expected = {
      'm221-gabbani-1-miner1': [
        {
          ts: 1724299140000,
          miner: 'm221-gabbani-1-miner1',
          powerMode: 'normal',
          data: { from: 1724299140000, to: 1724299240000 },
        },
      ],
    }

    const result = getCombinedPowerModeTimelineByMiner(data)
    expect(result).toEqual(expected)
  })

  it('should handle different power modes for the same miner', () => {
    const data = [
      {
        ts: 1724299140000,
        power_mode_group_aggr: { 'm221-gabbani-1-miner1': 'normal' },
        status_group_aggr: { 'm221-gabbani-1-miner1': 'mining' },
      },
      {
        ts: 1724299240000,
        power_mode_group_aggr: { 'm221-gabbani-1-miner1': 'low' },
        status_group_aggr: { 'm221-gabbani-1-miner1': 'mining' },
      },
    ]

    const expected = {
      'm221-gabbani-1-miner1': [
        {
          ts: 1724299140000,
          miner: 'm221-gabbani-1-miner1',
          powerMode: 'normal',
          data: { from: 1724299140000, to: 1724299140000 },
        },
        {
          ts: 1724299240000,
          miner: 'm221-gabbani-1-miner1',
          powerMode: 'low',
          data: { from: 1724299240000, to: 1724299240000 },
        },
      ],
    }

    const result = getCombinedPowerModeTimelineByMiner(data)
    expect(result).toEqual(expected)
  })

  it('should correctly handle multiple miners', () => {
    const data = [
      {
        ts: 1724299140000,
        power_mode_group_aggr: { miner1: 'normal', miner2: 'low' },
        status_group_aggr: { miner1: 'mining', miner2: 'idle' },
      },
      {
        ts: 1724299240000,
        power_mode_group_aggr: { miner1: 'normal', miner2: 'low' },
        status_group_aggr: { miner1: 'mining', miner2: 'idle' },
      },
    ]

    const expected = {
      miner1: [
        {
          ts: 1724299140000,
          miner: 'miner1',
          powerMode: 'normal',
          data: { from: 1724299140000, to: 1724299240000 },
        },
      ],
      miner2: [
        {
          ts: 1724299140000,
          miner: 'miner2',
          powerMode: 'low',
          data: { from: 1724299140000, to: 1724299240000 },
        },
      ],
    }

    const result = getCombinedPowerModeTimelineByMiner(data)
    expect(result).toEqual(expected)
  })

  it('should use status when power_mode_group_aggr is missing for a miner', () => {
    const data = [
      {
        ts: 1724299140000,
        status_group_aggr: { miner1: 'offline' },
      },
    ]

    const result = getCombinedPowerModeTimelineByMiner(data)
    expect(result.miner1[0].powerMode).toBe('offline')
  })

  it('should handle empty entry gracefully', () => {
    const data = [{}]

    const result = getCombinedPowerModeTimelineByMiner(data)
    expect(result).toEqual({})
  })
})

describe('getPowerModeTimelineDatasetObject', () => {
  it('should return an empty object when no combined power mode timeline is provided', () => {
    const result = getPowerModeTimelineDatasetObject({}, 'Africa/Algiers')
    expect(result).toEqual({})
  })

  it('should correctly create a dataset object with power mode information', () => {
    const combinedPowerModeTimelineByMiner = {
      'm221-gabbani-1-miner1': [
        {
          ts: 1724299140000,
          miner: 'm221-gabbani-1-miner1',
          powerMode: 'normal',
          data: { from: 1724299140000, to: 1724299140000 },
        },
      ],
    }

    const timezone = 'Africa/Algiers'
    const offset = 3600000

    const result = getPowerModeTimelineDatasetObject(combinedPowerModeTimelineByMiner, timezone)

    expect(result.normal).toBeDefined()
    expect(result.normal.label).toBe('normal')
    expect(result.normal.data).toHaveLength(1)
    expect(result.normal.data[0].x).toEqual([1724299140000 + offset, 1724299140000 + offset])
    expect(result.normal.data[0].y).toBe('m221-gabbani-1-miner1')
    expect(result.normal.color).toBeDefined()
  })

  it('should apply timezone offset correctly', () => {
    const combinedPowerModeTimelineByMiner = {
      miner1: [
        {
          ts: 1724299140000,
          miner: 'miner1',
          powerMode: 'normal',
          data: { from: 1724299140000, to: 1724299240000 },
        },
      ],
    }

    const timezone = 'Africa/Algiers'
    const offset = 3600000

    const result = getPowerModeTimelineDatasetObject(combinedPowerModeTimelineByMiner, timezone)

    expect(result.normal.data[0].x).toEqual([1724299140000 + offset, 1724299240000 + offset])
  })

  it('should handle multiple power modes correctly', () => {
    const combinedPowerModeTimelineByMiner = {
      miner1: [
        {
          ts: 1724299140000,
          miner: 'miner1',
          powerMode: 'normal',
          data: { from: 1724299140000, to: 1724299140000 },
        },
      ],
      miner2: [
        {
          ts: 1724299240000,
          miner: 'miner2',
          powerMode: 'low',
          data: { from: 1724299240000, to: 1724299240000 },
        },
      ],
    }

    const result = getPowerModeTimelineDatasetObject(combinedPowerModeTimelineByMiner, 'UTC')

    expect(result.normal).toBeDefined()
    expect(result.low).toBeDefined()
    expect(result.normal.label).toBe('normal')
    expect(result.low.label).toBe('low')
  })

  it('should assign color for known power modes', () => {
    const combined = {
      miner1: [
        {
          ts: 1724299140000,
          miner: 'miner1',
          powerMode: 'sleep',
          data: { from: 1724299140000, to: 1724299240000 },
        },
      ],
    }

    const result = getPowerModeTimelineDatasetObject(combined, 'UTC')
    expect(result.sleep.color).toBeDefined()
    expect(result.sleep.color).not.toBe('')
  })

  it('should handle unknown power modes with fallback color', () => {
    const combined = {
      miner1: [
        {
          ts: 1724299140000,
          miner: 'miner1',
          powerMode: 'unknown_mode',
          data: { from: 1724299140000, to: 1724299240000 },
        },
      ],
    }

    const result = getPowerModeTimelineDatasetObject(combined, 'UTC')
    expect(result.unknown_mode).toBeDefined()
    expect(result.unknown_mode.color).toBeDefined()
  })
})

describe('getPowerModeTimelineChartData', () => {
  it('returns empty labels and datasets when data is undefined', () => {
    const result = getPowerModeTimelineChartData(undefined, 'UTC')
    expect(result).toEqual({ labels: [], datasets: [] })
  })

  it('returns empty labels and datasets when data is empty array', () => {
    const result = getPowerModeTimelineChartData([], 'UTC')
    expect(result).toEqual({ labels: [], datasets: [] })
  })

  it('returns correct labels and datasets for valid data', () => {
    const data = [
      {
        ts: 1724299140000,
        power_mode_group_aggr: { 'miner-1': 'normal' },
        status_group_aggr: { 'miner-1': 'mining' },
      },
    ]
    const result = getPowerModeTimelineChartData(data, 'UTC')
    expect(result.labels).toContain('miner-1')
    expect(Array.isArray(result.datasets)).toBe(true)
    expect(result.datasets.length).toBeGreaterThan(0)
  })

  it('returns labels as miner names from status_group_aggr', () => {
    const data = [
      {
        ts: 1724299140000,
        power_mode_group_aggr: { 'miner-a': 'high', 'miner-b': 'low' },
        status_group_aggr: { 'miner-a': 'mining', 'miner-b': 'idle' },
      },
    ]

    const result = getPowerModeTimelineChartData(data, 'UTC')
    expect(result.labels).toContain('miner-a')
    expect(result.labels).toContain('miner-b')
  })

  it('datasets have required properties', () => {
    const data = [
      {
        ts: 1724299140000,
        power_mode_group_aggr: { 'miner-1': 'normal' },
        status_group_aggr: { 'miner-1': 'mining' },
      },
    ]

    const result = getPowerModeTimelineChartData(data, 'UTC')
    expect(result.datasets[0]).toHaveProperty('label')
    expect(result.datasets[0]).toHaveProperty('data')
    expect(result.datasets[0]).toHaveProperty('color')
  })
})

describe('transformToTimelineChartData', () => {
  it('should return empty labels and datasets when input has empty arrays', () => {
    const input = {
      labels: [],
      datasets: [],
    }

    const result = transformToTimelineChartData(input)

    expect(result).toEqual({
      labels: [],
      datasets: [],
    })
  })

  it('should correctly transform labels', () => {
    const input = {
      labels: ['miner-1', 'miner-2', 'miner-3'],
      datasets: [],
    }

    const result = transformToTimelineChartData(input)

    expect(result.labels).toEqual(['miner-1', 'miner-2', 'miner-3'])
  })

  it('should correctly transform a single dataset', () => {
    const input = {
      labels: ['miner-1'],
      datasets: [
        {
          label: 'normal',
          data: [{ x: [1724299140000, 1724299240000] as [number, number], y: 'miner-1' }],
          color: 'var(--mdk-color-green-500)',
        },
      ],
    }

    const result = transformToTimelineChartData(input)

    expect(result.datasets).toHaveLength(1)
    expect(result.datasets[0]).toEqual({
      label: 'normal',
      data: [{ x: [1724299140000, 1724299240000], y: 'miner-1' }],
      color: 'var(--mdk-color-green-500)',
    })
  })

  it('should correctly transform multiple datasets', () => {
    const input = {
      labels: ['miner-1', 'miner-2'],
      datasets: [
        {
          label: 'normal',
          data: [{ x: [1724299140000, 1724299240000] as [number, number], y: 'miner-1' }],
          color: 'var(--mdk-color-green-500)',
        },
        {
          label: 'low',
          data: [{ x: [1724299140000, 1724299240000] as [number, number], y: 'miner-2' }],
          color: 'var(--mdk-color-yellow-500)',
        },
      ],
    }

    const result = transformToTimelineChartData(input)

    expect(result.datasets).toHaveLength(2)
    expect(result.datasets[0].label).toBe('normal')
    expect(result.datasets[1].label).toBe('low')
  })

  it('should preserve data points with undefined y values', () => {
    const input = {
      labels: ['miner-1'],
      datasets: [
        {
          label: 'normal',
          data: [{ x: [1724299140000, 1724299240000] as [number, number], y: undefined }],
          color: 'var(--mdk-color-green-500)',
        },
      ],
    }

    const result = transformToTimelineChartData(input)

    expect(result.datasets[0].data[0].y).toBeUndefined()
  })

  it('should work with getPowerModeTimelineChartData output', () => {
    const rawData = [
      {
        ts: 1724299140000,
        power_mode_group_aggr: { 'miner-1': 'normal' },
        status_group_aggr: { 'miner-1': 'mining' },
      },
    ]

    const helperData = getPowerModeTimelineChartData(rawData, 'UTC')
    const result = transformToTimelineChartData(helperData)

    expect(result.labels).toContain('miner-1')
    expect(result.datasets[0]).toHaveProperty('label')
    expect(result.datasets[0]).toHaveProperty('data')
    expect(result.datasets[0]).toHaveProperty('color')
  })
})
