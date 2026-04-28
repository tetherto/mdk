import type { ChartDataset } from '@tetherto/mdk-core-ui'
import { describe, expect, it } from 'vitest'
import { useChartDataCheck } from '../use-chart-data-check'

describe('useChartDataCheck', () => {
  describe('no parameters provided', () => {
    it('should return true when no parameters are provided', () => {
      expect(useChartDataCheck({})).toBe(true)
    })

    it('should return true when both dataset and data are undefined', () => {
      expect(useChartDataCheck({ dataset: undefined, data: undefined })).toBe(true)
    })
  })

  describe('direct dataset (BarChart pattern)', () => {
    it('should return false when dataset has data values', () => {
      const dataset = { data: [1, 2, 3] }
      expect(useChartDataCheck({ dataset })).toBe(false)
    })

    it('should return true when dataset is empty object', () => {
      const dataset = {}
      expect(useChartDataCheck({ dataset })).toBe(true)
    })

    it('should return true when dataset has no data values', () => {
      const dataset = { label: 'Test', backgroundColor: 'red' }
      expect(useChartDataCheck({ dataset })).toBe(true)
    })

    it('should return false when dataset is array with data', () => {
      const dataset = [1, 2, 3, 4, 5]
      expect(useChartDataCheck({ dataset })).toBe(false)
    })

    it('should return true when dataset is empty array', () => {
      const dataset: unknown[] = []
      expect(useChartDataCheck({ dataset })).toBe(true)
    })

    it('should return false when dataset has nested data values', () => {
      const dataset = {
        series: [{ value: 10 }, { value: 20 }],
      }
      expect(useChartDataCheck({ dataset })).toBe(false)
    })

    it('should return false when dataset has value property', () => {
      const dataset = { value: 42 }
      expect(useChartDataCheck({ dataset })).toBe(false)
    })

    it('should return true when dataset only has null values', () => {
      const dataset = { data: null, value: undefined }
      expect(useChartDataCheck({ dataset })).toBe(true)
    })

    it('should prioritize dataset over data parameter', () => {
      const dataset = { count: 5 }
      const data = { datasets: [{ label: 'Test', data: [1, 2, 3] }] }
      // Should check dataset first, which has data (count: 5)
      expect(useChartDataCheck({ dataset, data })).toBe(false)
    })

    it('should return false for dataset with zero values', () => {
      const dataset = { data: [0, 0, 0] }
      expect(useChartDataCheck({ dataset })).toBe(false)
    })

    it('should return false for dataset with false boolean', () => {
      const dataset = { active: false }
      expect(useChartDataCheck({ dataset })).toBe(false)
    })

    it('should return false for dataset with empty string', () => {
      const dataset = { name: '' }
      expect(useChartDataCheck({ dataset })).toBe(false)
    })
  })

  describe('data.datasets (LineChart pattern)', () => {
    it('should return false when datasets have data', () => {
      const data = {
        datasets: [
          { label: 'Series 1', data: [1, 2, 3] },
          { label: 'Series 2', data: [4, 5, 6] },
        ] as ChartDataset[],
      }
      expect(useChartDataCheck({ data })).toBe(false)
    })

    it('should return true when all datasets are empty', () => {
      const data = {
        datasets: [
          { label: 'Series 1', data: [] },
          { label: 'Series 2', data: [] },
        ] as ChartDataset[],
      }
      expect(useChartDataCheck({ data })).toBe(true)
    })

    it('should return false when at least one dataset has data', () => {
      const data = {
        datasets: [
          { label: 'Empty', data: [] },
          { label: 'Has Data', data: [1, 2, 3] },
          { label: 'Also Empty', data: [] },
        ] as ChartDataset[],
      }
      expect(useChartDataCheck({ data })).toBe(false)
    })

    it('should return true when datasets array is empty', () => {
      const data = {
        datasets: [] as ChartDataset[],
      }
      expect(useChartDataCheck({ data })).toBe(true)
    })

    it('should return false for single dataset with data', () => {
      const data = {
        datasets: [{ label: 'Single', data: [10, 20, 30] }] as ChartDataset[],
      }
      expect(useChartDataCheck({ data })).toBe(false)
    })

    it('should handle datasets with additional properties', () => {
      const data = {
        datasets: [{ label: 'Test', data: [1, 2, 3] }] as ChartDataset[],
        labels: ['Jan', 'Feb', 'Mar'],
        options: {},
      }
      expect(useChartDataCheck({ data })).toBe(false)
    })

    it('should return true when datasets contain only null data', () => {
      const data = {
        datasets: [
          { label: 'Series 1', data: null },
          { label: 'Series 2', data: undefined },
        ] as any,
      }
      expect(useChartDataCheck({ data })).toBe(true)
    })

    it('should return false for datasets with zero values', () => {
      const data = {
        datasets: [{ label: 'Zeros', data: [0, 0, 0] }] as ChartDataset[],
      }
      expect(useChartDataCheck({ data })).toBe(false)
    })

    it('should return false for datasets with negative values', () => {
      const data = {
        datasets: [{ label: 'Negative', data: [-5, -10, -15] }] as ChartDataset[],
      }
      expect(useChartDataCheck({ data })).toBe(false)
    })
  })

  describe('data.dataset (custom chart pattern)', () => {
    it('should return false when dataset has data values', () => {
      const data = {
        dataset: { data: [1, 2, 3] },
      }
      expect(useChartDataCheck({ data })).toBe(false)
    })

    it('should return true when dataset is empty object', () => {
      const data = {
        dataset: {},
      }
      expect(useChartDataCheck({ data })).toBe(true)
    })

    it('should return true when dataset has no data values', () => {
      const data = {
        dataset: { label: 'Test', backgroundColor: 'red' },
      }
      expect(useChartDataCheck({ data })).toBe(true)
    })

    it('should return false when dataset is array with data', () => {
      const data = {
        dataset: [1, 2, 3, 4, 5],
      }
      expect(useChartDataCheck({ data })).toBe(false)
    })

    it('should return true when dataset is empty array', () => {
      const data = {
        dataset: [],
      }
      expect(useChartDataCheck({ data })).toBe(true)
    })

    it('should return false when dataset has nested data', () => {
      const data = {
        dataset: {
          points: [
            { x: 1, y: 2 },
            { x: 3, y: 4 },
          ],
        },
      }
      expect(useChartDataCheck({ data })).toBe(false)
    })

    it('should return false when dataset has value property', () => {
      const data = {
        dataset: { value: 100 },
      }
      expect(useChartDataCheck({ data })).toBe(false)
    })

    it('should return true when dataset only has null values', () => {
      const data = {
        dataset: { data: null, count: undefined },
      }
      expect(useChartDataCheck({ data })).toBe(true)
    })

    it('should handle dataset with additional chart properties', () => {
      const data = {
        dataset: { data: [5, 10, 15] },
        options: { responsive: true },
      }
      expect(useChartDataCheck({ data })).toBe(false)
    })
  })

  describe('type guards - hasDatasets', () => {
    it('should recognize valid datasets structure', () => {
      const data = {
        datasets: [{ label: 'Test', data: [1, 2, 3] }] as ChartDataset[],
      }
      expect(useChartDataCheck({ data })).toBe(false)
    })

    it('should not recognize data without datasets property', () => {
      const data = {
        series: [{ label: 'Test', data: [1, 2, 3] }],
      }
      // Should fall through to return true (no valid data found)
      expect(useChartDataCheck({ data })).toBe(true)
    })

    it('should not recognize data with non-array datasets', () => {
      const data = {
        datasets: 'not an array',
      }
      // Should fall through to return true
      expect(useChartDataCheck({ data: data as any })).toBe(true)
    })

    it('should not recognize null data', () => {
      const data = null
      expect(useChartDataCheck({ data: data as any })).toBe(true)
    })

    it('should not recognize array data', () => {
      const data = [1, 2, 3]
      expect(useChartDataCheck({ data })).toBe(true)
    })
  })

  describe('type guards - hasDataset', () => {
    it('should recognize valid dataset structure', () => {
      const data = {
        dataset: { data: [1, 2, 3] },
      }
      expect(useChartDataCheck({ data })).toBe(false)
    })

    it('should not recognize data without dataset property', () => {
      const data = {
        series: { data: [1, 2, 3] },
      }
      expect(useChartDataCheck({ data })).toBe(true)
    })

    it('should recognize dataset with array', () => {
      const data = {
        dataset: [1, 2, 3],
      }
      expect(useChartDataCheck({ data })).toBe(false)
    })
  })

  describe('priority order', () => {
    it('should prioritize dataset over data.datasets', () => {
      const dataset = { count: 0 } // Has data (count: 0)
      const data = {
        datasets: [{ label: 'Test', data: [1, 2, 3] }] as ChartDataset[],
      }
      // dataset is checked first and has data
      expect(useChartDataCheck({ dataset, data })).toBe(false)
    })

    it('should prioritize dataset over data.dataset', () => {
      const dataset = { value: 42 }
      const data = {
        dataset: { data: [1, 2, 3] },
      }
      // dataset is checked first and has data
      expect(useChartDataCheck({ dataset, data })).toBe(false)
    })

    it('should check data.datasets before data.dataset', () => {
      const data = {
        datasets: [{ label: 'Test', data: [1, 2, 3] }] as ChartDataset[],
        dataset: { data: [4, 5, 6] },
      }
      // datasets is checked first and has data
      expect(useChartDataCheck({ data })).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle data as primitive value', () => {
      expect(useChartDataCheck({ data: 42 as any })).toBe(true)
      expect(useChartDataCheck({ data: 'string' as any })).toBe(true)
      expect(useChartDataCheck({ data: true as any })).toBe(true)
    })

    it('should handle data as null', () => {
      expect(useChartDataCheck({ data: null as any })).toBe(true)
    })

    it('should handle data as undefined', () => {
      expect(useChartDataCheck({ data: undefined })).toBe(true)
    })

    it('should handle data as plain array', () => {
      expect(useChartDataCheck({ data: [1, 2, 3] })).toBe(true)
    })

    it('should handle data as empty object', () => {
      expect(useChartDataCheck({ data: {} })).toBe(true)
    })

    it('should handle dataset as null', () => {
      expect(useChartDataCheck({ dataset: null as any })).toBe(true)
    })

    it('should handle dataset as undefined explicitly', () => {
      expect(useChartDataCheck({ dataset: undefined })).toBe(true)
    })

    it('should handle complex nested structures', () => {
      const data = {
        datasets: [
          {
            label: 'Complex',
            data: [
              { x: 1, y: 2, meta: { info: 'test' } },
              { x: 3, y: 4, meta: { info: 'test2' } },
            ],
          },
        ] as any,
      }
      expect(useChartDataCheck({ data })).toBe(false)
    })

    it('should handle large datasets', () => {
      const largeData = Array.from({ length: 10000 }, (_, i) => i)
      const data = {
        datasets: [{ label: 'Large', data: largeData }] as ChartDataset[],
      }
      expect(useChartDataCheck({ data })).toBe(false)
    })

    it('should handle dataset with only ignored Chart.js properties', () => {
      const dataset = {
        label: 'Test',
        backgroundColor: 'red',
        borderColor: 'blue',
        borderWidth: 2,
      }
      expect(useChartDataCheck({ dataset })).toBe(true)
    })

    it('should handle mixed valid and ignored properties', () => {
      const dataset = {
        label: 'Test',
        backgroundColor: 'red',
        data: [1, 2, 3],
      }
      expect(useChartDataCheck({ dataset })).toBe(false)
    })
  })

  describe('real-world scenarios', () => {
    it('should handle BarChart use case', () => {
      const barChartDataset = {
        label: 'Sales',
        data: [12, 19, 3, 5, 2, 3],
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
      }
      expect(useChartDataCheck({ dataset: barChartDataset })).toBe(false)
    })

    it('should handle LineChart use case', () => {
      const lineChartData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Revenue',
            data: [65, 59, 80, 81, 56, 55],
            borderColor: 'rgb(75, 192, 192)',
          },
          {
            label: 'Expenses',
            data: [28, 48, 40, 19, 86, 27],
            borderColor: 'rgb(255, 99, 132)',
          },
        ] as ChartDataset[],
      }
      expect(useChartDataCheck({ data: lineChartData })).toBe(false)
    })

    it('should handle empty state for BarChart', () => {
      const emptyDataset = {
        label: 'Sales',
        data: [],
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
      }
      expect(useChartDataCheck({ dataset: emptyDataset })).toBe(true)
    })

    it('should handle empty state for LineChart', () => {
      const emptyData = {
        labels: ['Jan', 'Feb', 'Mar'],
        datasets: [] as ChartDataset[],
      }
      expect(useChartDataCheck({ data: emptyData })).toBe(true)
    })

    it('should handle ScatterChart with x/y coordinates', () => {
      const scatterData = {
        datasets: [
          {
            label: 'Scatter Dataset',
            data: [
              { x: 1, y: 2 },
              { x: 2, y: 4 },
              { x: 3, y: 6 },
            ],
          },
        ] as any,
      }
      expect(useChartDataCheck({ data: scatterData })).toBe(false)
    })

    it('should handle DoughnutChart', () => {
      const doughnutData = {
        datasets: [
          {
            label: 'Distribution',
            data: [300, 50, 100],
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
          },
        ] as ChartDataset[],
      }
      expect(useChartDataCheck({ data: doughnutData })).toBe(false)
    })

    it('should handle custom chart with dataset', () => {
      const customData = {
        dataset: {
          points: [10, 20, 30, 40, 50],
          threshold: 25,
        },
      }
      expect(useChartDataCheck({ data: customData })).toBe(false)
    })
  })
})
