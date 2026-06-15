import { describe, expect, it } from 'vitest'

import { isBarChartEmpty, toBarChartData } from '../to-bar-chart-data'

describe('isBarChartEmpty', () => {
  it('returns true for empty series array', () => {
    expect(isBarChartEmpty({ series: [] })).toBe(true)
  })

  it('returns true when every series has empty values array', () => {
    expect(isBarChartEmpty({ series: [{ label: 'A', values: [] }] })).toBe(true)
  })

  it('returns true when every value across every series is zero', () => {
    expect(
      isBarChartEmpty({
        series: [
          { label: 'A', values: [0, 0, 0] },
          { label: 'B', values: [0] },
        ],
      }),
    ).toBe(true)
  })

  it('returns true when every series uses object values that are all zero', () => {
    expect(
      isBarChartEmpty({
        series: [{ label: 'A', values: { Jan: 0, Feb: 0 } }],
      }),
    ).toBe(true)
  })

  it('returns false when any series has a non-zero value', () => {
    expect(
      isBarChartEmpty({
        series: [
          { label: 'A', values: [0, 0] },
          { label: 'B', values: [0, 1] },
        ],
      }),
    ).toBe(false)
  })

  it('returns false when a single series has a non-zero value', () => {
    expect(isBarChartEmpty({ series: [{ label: 'A', values: [0, 0, 5] }] })).toBe(false)
  })

  it('returns false when object-keyed values contain a non-zero entry', () => {
    expect(
      isBarChartEmpty({
        series: [{ label: 'A', values: { Jan: 0, Feb: 3 } }],
      }),
    ).toBe(false)
  })
})

describe('toBarChartData', () => {
  describe('isEmpty flag', () => {
    it('is true for empty series', () => {
      const result = toBarChartData({ series: [] })
      expect(result.isEmpty).toBe(true)
    })

    it('is true for zero-only series', () => {
      const result = toBarChartData({
        labels: ['A', 'B'],
        series: [{ label: 'X', values: [0, 0] }],
      })
      expect(result.isEmpty).toBe(true)
    })

    it('is false when any series has non-zero values', () => {
      const result = toBarChartData({
        labels: ['A', 'B'],
        series: [{ label: 'X', values: [0, 10] }],
      })
      expect(result.isEmpty).toBe(false)
    })
  })

  describe('single series', () => {
    it('produces one bar dataset with correct label and data', () => {
      const result = toBarChartData({
        labels: ['Jan', 'Feb', 'Mar'],
        series: [{ label: 'Revenue', values: [100, 200, 150], color: '#3b82f6' }],
      })

      expect(result.labels).toEqual(['Jan', 'Feb', 'Mar'])
      expect(result.datasets).toHaveLength(1)
      expect(result.datasets[0]).toMatchObject({
        type: 'bar',
        label: 'Revenue',
        data: [100, 200, 150],
        borderColor: '#3b82f6',
      })
    })

    it('derives numeric labels when none are provided', () => {
      const result = toBarChartData({
        series: [{ label: 'A', values: [10, 20, 30] }],
      })

      expect(result.labels).toEqual(['1', '2', '3'])
    })
  })

  describe('grouped series', () => {
    it('produces one dataset per series', () => {
      const result = toBarChartData({
        labels: ['Q1', 'Q2'],
        series: [
          { label: 'Alpha', values: [10, 20] },
          { label: 'Beta', values: [30, 40] },
        ],
      })

      expect(result.datasets).toHaveLength(2)
      expect(result.datasets[0]).toMatchObject({ label: 'Alpha', data: [10, 20] })
      expect(result.datasets[1]).toMatchObject({ label: 'Beta', data: [30, 40] })
    })

    it('preserves stack grouping', () => {
      const result = toBarChartData({
        labels: ['A'],
        series: [
          { label: 'S1', values: [5], stack: 'group1' },
          { label: 'S2', values: [3], stack: 'group1' },
        ],
      })

      expect(result.datasets[0]).toMatchObject({ stack: 'group1' })
      expect(result.datasets[1]).toMatchObject({ stack: 'group1' })
    })
  })

  describe('datalabels passthrough', () => {
    it('attaches datalabels override to the matching dataset', () => {
      const formatter = (v: number) => `${v}%`
      const result = toBarChartData({
        labels: ['A', 'B'],
        series: [
          {
            label: 'X',
            values: [10, 20],
            dataLabels: {
              formatter,
              anchor: 'end',
              align: 'top',
              offset: 4,
              font: { size: 11, weight: 'bold' },
              padding: 2,
            },
          },
        ],
      })

      expect(result.datasets[0]).toMatchObject({
        datalabels: {
          formatter,
          anchor: 'end',
          align: 'top',
          offset: 4,
          font: { size: 11, weight: 'bold' },
          padding: 2,
        },
      })
    })

    it('only applies datalabels to the series that declares it', () => {
      const result = toBarChartData({
        labels: ['A'],
        series: [
          { label: 'No-labels', values: [5] },
          { label: 'Has-labels', values: [10], dataLabels: { anchor: 'start' } },
        ],
      })

      expect(result.datasets[0]).not.toHaveProperty('datalabels')
      expect(result.datasets[1]).toMatchObject({ datalabels: { anchor: 'start' } })
    })

    it('does not attach datalabels when not provided', () => {
      const result = toBarChartData({
        labels: ['A'],
        series: [{ label: 'Plain', values: [7] }],
      })

      expect(result.datasets[0]).not.toHaveProperty('datalabels')
    })
  })

  describe('object-keyed values', () => {
    it('maps object values to array using labels order', () => {
      const result = toBarChartData({
        labels: ['Jan', 'Feb', 'Mar'],
        series: [{ label: 'S', values: { Jan: 10, Mar: 30 } }],
      })

      expect(result.datasets[0]?.data).toEqual([10, null, 30])
    })
  })
})
