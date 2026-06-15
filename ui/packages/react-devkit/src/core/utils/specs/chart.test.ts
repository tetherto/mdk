import type { ChartDataset } from 'chart.js'
import { describe, expect, it } from 'vitest'

import { getChartDataAvailability, hasDataValues, hexToOpacity, processDataset } from '../chart'

describe('hexToOpacity', () => {
  it('should convert 6-digit hex to rgba with default opacity', () => {
    expect(hexToOpacity('#FF0000')).toBe('rgba(255, 0, 0, 0.2)')
  })

  it('should convert 6-digit hex to rgba with custom opacity', () => {
    expect(hexToOpacity('#FF0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)')
  })

  it('should convert 3-digit hex to rgba', () => {
    expect(hexToOpacity('#F00')).toBe('rgba(255, 0, 0, 0.2)')
  })

  it('should handle hex without # prefix', () => {
    expect(hexToOpacity('FF0000')).toBe('rgba(255, 0, 0, 0.2)')
  })

  it('should handle black color', () => {
    expect(hexToOpacity('#000000')).toBe('rgba(0, 0, 0, 0.2)')
  })

  it('should handle white color', () => {
    expect(hexToOpacity('#FFFFFF')).toBe('rgba(255, 255, 255, 0.2)')
  })

  it('should throw TypeError for non-string input', () => {
    expect(() => hexToOpacity(123 as unknown as string)).toThrow(TypeError)
  })
})

describe('processDataset', () => {
  it('should merge new data into empty existing dataset', () => {
    const newData = {
      default: [
        { ts: 1, value: 10 },
        { ts: 2, value: 20 },
      ],
    }
    const existing = {} as Record<string, unknown[]>

    const result = processDataset(newData, existing)

    expect(result.default).toHaveLength(2)
  })

  it('should deduplicate by ts key', () => {
    const newData = { default: [{ ts: 1, value: 20 }] }
    const existing = {
      default: [
        { ts: 1, value: 10 },
        { ts: 2, value: 15 },
      ],
    }

    const result = processDataset(newData, existing)

    expect(result.default).toHaveLength(2)
    const item = (result.default as Array<{ ts: number; value: number }>).find((d) => d.ts === 1)
    expect(item?.value).toBe(20)
  })

  it('should apply processor function', () => {
    const newData = { default: [{ ts: 1, value: 10 }] }
    const existing = {} as Record<string, unknown[]>
    const processor = (data: unknown) =>
      (data as Array<{ ts: number; value: number }>).map((d) => ({ ...d, value: d.value * 2 }))

    const result = processDataset(newData, existing, processor)

    const item = (result.default as Array<{ ts: number; value: number }>)[0]
    expect(item?.value).toBe(20)
  })

  it('should handle multiple keys', () => {
    const newData = {
      hashrate: [{ ts: 1, value: 100 }],
      power: [{ ts: 1, value: 200 }],
    }
    const existing = {} as Record<string, unknown[]>

    const result = processDataset(newData, existing)

    expect(Object.keys(result)).toEqual(['hashrate', 'power'])
    expect(result.hashrate).toHaveLength(1)
    expect(result.power).toHaveLength(1)
  })

  it('should handle null processor', () => {
    const newData = { default: [{ ts: 1, value: 10 }] }
    const existing = {} as Record<string, unknown[]>

    const result = processDataset(newData, existing, null)

    expect(result.default).toHaveLength(1)
  })
})

describe('chartUtils', () => {
  describe('getChartDataAvailability', () => {
    it('should return false for null datasets', () => {
      expect(getChartDataAvailability(null as any)).toBe(false)
    })

    it('should return false for undefined datasets', () => {
      expect(getChartDataAvailability(undefined as any)).toBe(false)
    })

    it('should return false for empty datasets array', () => {
      expect(getChartDataAvailability([])).toBe(false)
    })

    it('should return true for datasets with data', () => {
      const datasets: ChartDataset[] = [{ label: 'Series 1', data: [1, 2, 3] }]
      expect(getChartDataAvailability(datasets)).toBe(true)
    })

    it('should return true if at least one dataset has data', () => {
      const datasets: ChartDataset[] = [
        { label: 'Series 1', data: [] },
        { label: 'Series 2', data: [1, 2, 3] },
        { label: 'Series 3', data: [] },
      ]
      expect(getChartDataAvailability(datasets)).toBe(true)
    })

    it('should return false if all datasets are empty', () => {
      const datasets: ChartDataset[] = [
        { label: 'Series 1', data: [] },
        { label: 'Series 2', data: [] },
      ]
      expect(getChartDataAvailability(datasets)).toBe(false)
    })

    it('should return false if datasets have no data property', () => {
      const datasets = [{ label: 'Series 1' }, { label: 'Series 2' }]
      expect(getChartDataAvailability(datasets as any)).toBe(false)
    })

    it('should return false for datasets with null data', () => {
      const datasets = [{ label: 'Series 1', data: null }]
      expect(getChartDataAvailability(datasets as any)).toBe(false)
    })

    it('should return false for datasets with undefined data', () => {
      const datasets = [{ label: 'Series 1', data: undefined }]
      expect(getChartDataAvailability(datasets as any)).toBe(false)
    })

    it('should handle multiple datasets with various data states', () => {
      const datasets = [
        { label: 'Empty', data: [] },
        { label: 'Null', data: null },
        { label: 'Undefined', data: undefined },
        { label: 'Valid', data: [10, 20, 30] },
        { label: 'Another Empty', data: [] },
      ]
      expect(getChartDataAvailability(datasets as any)).toBe(true)
    })

    it('should return true for datasets with zero values', () => {
      const datasets: ChartDataset[] = [{ label: 'Series 1', data: [0, 0, 0] }]
      expect(getChartDataAvailability(datasets)).toBe(true)
    })

    it('should return true for datasets with single value', () => {
      const datasets: ChartDataset[] = [{ label: 'Series 1', data: [42] }]
      expect(getChartDataAvailability(datasets)).toBe(true)
    })

    it('should return true for datasets with negative values', () => {
      const datasets: ChartDataset[] = [{ label: 'Series 1', data: [-5, -10, -15] }]
      expect(getChartDataAvailability(datasets)).toBe(true)
    })

    it('should return true for datasets with mixed positive and negative values', () => {
      const datasets: ChartDataset[] = [{ label: 'Series 1', data: [-5, 0, 5, 10] }]
      expect(getChartDataAvailability(datasets)).toBe(true)
    })

    it('should handle datasets that are not plain objects', () => {
      const datasets = [null, undefined, 'not an object', 42]
      expect(getChartDataAvailability(datasets as any)).toBe(false)
    })

    it('should handle datasets with non-array data property', () => {
      const datasets = [
        { label: 'Series 1', data: 'not an array' },
        { label: 'Series 2', data: 123 },
        { label: 'Series 3', data: { value: 1 } },
      ]
      expect(getChartDataAvailability(datasets as any)).toBe(false)
    })

    it('should return true for large datasets', () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => i)
      const datasets: ChartDataset[] = [{ label: 'Large Series', data: largeData }]
      expect(getChartDataAvailability(datasets)).toBe(true)
    })
  })

  describe('hasDataValues', () => {
    describe('primitive values', () => {
      it('should return true for numbers', () => {
        expect(hasDataValues(0)).toBe(true)
        expect(hasDataValues(42)).toBe(true)
        expect(hasDataValues(-1)).toBe(true)
        expect(hasDataValues(3.14)).toBe(true)
        expect(hasDataValues(Infinity)).toBe(true)
        expect(hasDataValues(-Infinity)).toBe(true)
      })

      it('should return true for NaN', () => {
        expect(hasDataValues(Number.NaN)).toBe(true)
      })

      it('should return true for strings', () => {
        expect(hasDataValues('')).toBe(true)
        expect(hasDataValues('hello')).toBe(true)
        expect(hasDataValues('0')).toBe(true)
        expect(hasDataValues(' ')).toBe(true)
      })

      it('should return true for booleans', () => {
        expect(hasDataValues(true)).toBe(true)
        expect(hasDataValues(false)).toBe(true)
      })

      it('should return false for null', () => {
        expect(hasDataValues(null)).toBe(false)
      })

      it('should return false for undefined', () => {
        expect(hasDataValues(undefined)).toBe(false)
      })
    })

    describe('arrays', () => {
      it('should return false for empty array', () => {
        expect(hasDataValues([])).toBe(false)
      })

      it('should return true for array with numbers', () => {
        expect(hasDataValues([1, 2, 3])).toBe(true)
        expect(hasDataValues([0])).toBe(true)
        expect(hasDataValues([-1, -2, -3])).toBe(true)
      })

      it('should return true for array with strings', () => {
        expect(hasDataValues(['a', 'b', 'c'])).toBe(true)
        expect(hasDataValues([''])).toBe(true)
      })

      it('should return true for array with booleans', () => {
        expect(hasDataValues([true, false])).toBe(true)
        expect(hasDataValues([false])).toBe(true)
      })

      it('should return false for array with only null/undefined', () => {
        expect(hasDataValues([null, undefined])).toBe(false)
        expect(hasDataValues([null, null, null])).toBe(false)
        expect(hasDataValues([undefined, undefined])).toBe(false)
      })

      it('should return true for array with mixed values including non-nil', () => {
        expect(hasDataValues([null, 1, undefined])).toBe(true)
        expect(hasDataValues([undefined, 'data', null])).toBe(true)
        expect(hasDataValues([null, 0, null])).toBe(true)
      })

      it('should return true for nested arrays with data', () => {
        expect(
          hasDataValues([
            [1, 2],
            [3, 4],
          ]),
        ).toBe(true)
        expect(hasDataValues([[], [1]])).toBe(true)
        expect(hasDataValues([[[1]]])).toBe(true)
      })

      it('should return false for nested empty arrays', () => {
        expect(hasDataValues([[], []])).toBe(false)
        expect(hasDataValues([[], [[]], []])).toBe(false)
      })

      it('should return true for array with objects containing data', () => {
        expect(hasDataValues([{ value: 10 }, { value: 20 }])).toBe(true)
        expect(hasDataValues([{ data: [1, 2, 3] }])).toBe(true)
        expect(hasDataValues([{ x: 1, y: 2 }])).toBe(true)
      })

      it('should return false for array with empty objects', () => {
        expect(hasDataValues([{}, {}])).toBe(false)
      })

      it('should return false for array with objects containing only ignored properties', () => {
        expect(hasDataValues([{ label: 'Test' }])).toBe(false)
        expect(hasDataValues([{ backgroundColor: 'red', label: 'Chart' }])).toBe(false)
      })
    })

    describe('objects', () => {
      it('should return false for empty object', () => {
        expect(hasDataValues({})).toBe(false)
      })

      it('should return true for object with data values', () => {
        expect(hasDataValues({ count: 5 })).toBe(true)
        expect(hasDataValues({ name: 'test' })).toBe(true)
        expect(hasDataValues({ active: true })).toBe(true)
        expect(hasDataValues({ amount: 0 })).toBe(true)
      })

      it('should return true for object with value property', () => {
        expect(hasDataValues({ value: 100 })).toBe(true)
        expect(hasDataValues({ value: 0 })).toBe(true)
        expect(hasDataValues({ value: 'data' })).toBe(true)
        expect(hasDataValues({ value: false })).toBe(true)
        expect(hasDataValues({ value: '' })).toBe(true)
      })

      it('should return false for object with value property set to null/undefined', () => {
        expect(hasDataValues({ value: null })).toBe(false)
        expect(hasDataValues({ value: undefined })).toBe(false)
      })

      it('should return false for object with only ignored properties', () => {
        expect(hasDataValues({ label: 'Chart' })).toBe(false)
        expect(hasDataValues({ backgroundColor: 'red' })).toBe(false)
        expect(hasDataValues({ label: 'Test', borderColor: 'blue' })).toBe(false)
        expect(hasDataValues({ labels: ['a', 'b', 'c'] })).toBe(false)
      })

      it('should return true for object with data and ignored properties', () => {
        expect(hasDataValues({ label: 'Chart', data: [1, 2, 3] })).toBe(true)
        expect(hasDataValues({ backgroundColor: 'red', count: 5 })).toBe(true)
        expect(hasDataValues({ label: 'Test', value: 42 })).toBe(true)
      })

      it('should return false for object with null/undefined data values', () => {
        expect(hasDataValues({ data: null })).toBe(false)
        expect(hasDataValues({ value: undefined })).toBe(false)
        expect(hasDataValues({ count: null, total: undefined })).toBe(false)
      })

      it('should return true for nested objects with data', () => {
        expect(hasDataValues({ series: { value: 10 } })).toBe(true)
        expect(hasDataValues({ nested: { data: [1, 2, 3] } })).toBe(true)
        expect(hasDataValues({ level1: { level2: { value: 42 } } })).toBe(true)
      })

      it('should return false for deeply nested empty objects', () => {
        expect(hasDataValues({ nested: {} })).toBe(false)
        expect(hasDataValues({ level1: { level2: {} } })).toBe(false)
        expect(hasDataValues({ level1: { level2: { level3: {} } } })).toBe(false)
      })

      it('should return true for object with array data', () => {
        expect(hasDataValues({ data: [1, 2, 3] })).toBe(true)
        expect(hasDataValues({ values: [10, 20, 30] })).toBe(true)
        expect(hasDataValues({ points: [{ x: 1, y: 2 }] })).toBe(true)
      })

      it('should return false for object with empty array data', () => {
        expect(hasDataValues({ data: [] })).toBe(false)
        expect(hasDataValues({ values: [] })).toBe(false)
      })

      it('should return false for object with array of nulls', () => {
        expect(hasDataValues({ data: [null, null] })).toBe(false)
      })
    })

    describe('chart-specific scenarios', () => {
      it('should return true for Chart.js dataset with data', () => {
        const dataset = {
          label: 'Series 1',
          data: [1, 2, 3, 4, 5],
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
        }
        expect(hasDataValues(dataset)).toBe(true)
      })

      it('should return false for Chart.js dataset without data', () => {
        const dataset = {
          label: 'Series 1',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
        }
        expect(hasDataValues(dataset)).toBe(false)
      })

      it('should return true for multiple datasets array', () => {
        const datasets = [
          { label: 'Series 1', data: [1, 2, 3] },
          { label: 'Series 2', data: [4, 5, 6] },
        ]
        expect(hasDataValues(datasets)).toBe(true)
      })

      it('should return true even if one dataset has data', () => {
        const datasets = [
          { label: 'Series 1', data: [] },
          { label: 'Series 2', data: [4, 5, 6] },
        ]
        expect(hasDataValues(datasets)).toBe(true)
      })

      it('should return false for array of datasets without data', () => {
        const datasets = [
          { label: 'Series 1', data: [] },
          { label: 'Series 2', data: [] },
        ]
        expect(hasDataValues(datasets)).toBe(false)
      })

      it('should ignore all chart styling properties', () => {
        const dataset = {
          label: 'Test',
          labels: ['Jan', 'Feb', 'Mar'],
          backgroundColor: 'red',
          borderColor: 'blue',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5,
          borderDash: [5, 5],
          order: 1,
          stack: 'stack1',
          hidden: false,
          yAxisID: 'y',
          xAxisID: 'x',
          type: 'line',
        }
        expect(hasDataValues(dataset)).toBe(false)
      })

      it('should return true for custom value structures', () => {
        expect(hasDataValues({ x: 10, y: 20 })).toBe(true)
        expect(
          hasDataValues([
            { x: 1, y: 2 },
            { x: 3, y: 4 },
          ]),
        ).toBe(true)
        expect(hasDataValues({ r: 5, theta: 45 })).toBe(true)
      })

      it('should return true for time-series data', () => {
        expect(
          hasDataValues([
            { t: '2023-01-01', y: 10 },
            { t: '2023-01-02', y: 20 },
          ]),
        ).toBe(true)
      })

      it('should return true for scatter plot data', () => {
        expect(
          hasDataValues([
            { x: 1, y: 2 },
            { x: 3, y: 4 },
            { x: 5, y: 6 },
          ]),
        ).toBe(true)
      })

      it('should return true for bubble chart data', () => {
        expect(
          hasDataValues([
            { x: 1, y: 2, r: 5 },
            { x: 3, y: 4, r: 10 },
          ]),
        ).toBe(true)
      })
    })

    describe('edge cases', () => {
      it('should handle objects with numeric keys', () => {
        expect(hasDataValues({ 0: 'value', 1: 'data' })).toBe(true)
        expect(hasDataValues({ 0: null, 1: undefined })).toBe(false)
      })

      it('should return true for zero values', () => {
        expect(hasDataValues({ count: 0 })).toBe(true)
        expect(hasDataValues([0, 0, 0])).toBe(true)
        expect(hasDataValues({ value: 0 })).toBe(true)
      })

      it('should return true for empty string values', () => {
        expect(hasDataValues({ name: '' })).toBe(true)
        expect(hasDataValues(['', ''])).toBe(true)
      })

      it('should return true for false boolean values', () => {
        expect(hasDataValues({ active: false })).toBe(true)
        expect(hasDataValues([false, false])).toBe(true)
      })

      it('should handle mixed types in arrays', () => {
        expect(hasDataValues([1, 'two', true, { value: 4 }])).toBe(true)
        expect(hasDataValues([null, undefined, null])).toBe(false)
      })

      it('should handle deeply nested structures', () => {
        expect(
          hasDataValues({
            level1: {
              level2: {
                level3: {
                  level4: {
                    value: 42,
                  },
                },
              },
            },
          }),
        ).toBe(true)
      })

      it('should handle objects with only label properties at various levels', () => {
        expect(
          hasDataValues({
            label: 'Top',
            nested: {
              label: 'Nested',
              deeper: {
                label: 'Deep',
              },
            },
          }),
        ).toBe(false)
      })

      it('should handle combination of ignored and valid properties in nested objects', () => {
        expect(
          hasDataValues({
            label: 'Chart',
            series: {
              backgroundColor: 'red',
              points: [1, 2, 3],
            },
          }),
        ).toBe(true)
      })

      it('should handle sparse arrays', () => {
        const sparse = Array.from({ length: 5 })
        sparse[2] = 10
        expect(hasDataValues(sparse)).toBe(true)
      })

      it('should handle array-like objects', () => {
        expect(hasDataValues({ 0: 'a', 1: 'b', length: 2 })).toBe(true)
      })

      it('should return false for object with only null nested values', () => {
        expect(
          hasDataValues({
            a: null,
            b: { c: null, d: { e: null } },
          }),
        ).toBe(false)
      })

      it('should handle very large datasets', () => {
        const largeArray = Array.from({ length: 10000 }, (_, i) => i)
        expect(hasDataValues(largeArray)).toBe(true)
      })
    })
  })
})
