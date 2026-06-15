import {
  buildBarChart,
  buildConstant,
  buildEfficiencyChart,
  buildHashrateChart,
  buildLineChart,
  buildLineSeries,
  buildRevenueChart,
  buildSeries,
  createEmptyChart,
  EMPTY_STRUCTURES,
  formatDataLabel,
} from '../chart-builders'

describe('chart-builders', () => {
  describe('formatDataLabel', () => {
    it('returns 0 for zero', () => {
      expect(formatDataLabel(0)).toBe('0')
    })
    it('returns formatted number for finite value', () => {
      expect(formatDataLabel(1000)).toBeDefined()
      expect(formatDataLabel(0.001)).toBeDefined()
    })
  })

  describe('buildSeries', () => {
    it('returns series with label, values, color, gradient, datalabels', () => {
      const result = buildSeries('Test', [1, 2, 3], '#fff')
      expect(result.label).toBe('Test')
      expect(result.values).toEqual([1, 2, 3])
      expect(result.color).toBe('#fff')
      expect(result.gradient).toBeDefined()
      expect(result.datalabels).toBeDefined()
    })
  })

  describe('buildLineSeries', () => {
    it('returns line series with points', () => {
      const result = buildLineSeries(
        'Line',
        [
          { ts: 1704067200000, value: 10 },
          { ts: 1704153600000, value: 20 },
        ],
        '#000',
      )
      expect(result.label).toBe('Line')
      expect(result.points).toHaveLength(2)
      expect(result.points[0].value).toBe(10)
    })
  })

  describe('buildConstant', () => {
    it('returns constant with label, value, color', () => {
      const result = buildConstant('Max', 100, '#f00')
      expect(result).toEqual({ label: 'Max', value: 100, color: '#f00' })
    })
  })

  describe('buildBarChart', () => {
    it('returns bar chart with labels and series', () => {
      const result = buildBarChart(['Jan', 'Feb'], [{ label: 'S1', values: [1, 2], color: '#0f0' }])
      expect(result.labels).toEqual(['Jan', 'Feb'])
      expect(result.series).toHaveLength(1)
      expect(result.series[0].values).toEqual([1, 2])
    })
  })

  describe('buildLineChart', () => {
    it('returns line chart with series and constants', () => {
      const result = buildLineChart(
        [{ label: 'L1', data: [{ ts: 1, value: 10 }], color: '#00f' }],
        [{ label: 'C1', value: 5, color: '#f00' }],
      )
      expect(result.series).toHaveLength(1)
      expect(result.constants).toHaveLength(1)
      expect(result.constants[0].value).toBe(5)
    })
  })

  describe('buildHashrateChart', () => {
    it('returns line chart with hashrate series and nominal constant', () => {
      const result = buildHashrateChart([{ ts: 1, value: 100 }], 200)
      expect(result.series).toHaveLength(1)
      expect(result.constants).toHaveLength(1)
      expect(result.constants[0].value).toBe(200)
    })
  })

  describe('buildEfficiencyChart', () => {
    it('returns line chart with efficiency series and nominal constant', () => {
      const result = buildEfficiencyChart([{ ts: 1, value: 50 }], 45)
      expect(result.series).toHaveLength(1)
      expect(result.constants[0].value).toBe(45)
    })
  })

  describe('buildRevenueChart', () => {
    it('returns bar chart with revenue series', () => {
      const result = buildRevenueChart(['Jan', 'Feb'], {
        allInCost: [1, 2],
        hashRevenue: [3, 4],
        networkHashprice: [5, 6],
      })
      expect(result.labels).toEqual(['Jan', 'Feb'])
      expect(result.series).toHaveLength(3)
    })
  })

  describe('createEmptyChart', () => {
    it('returns object with empty labels and series per field', () => {
      const result = createEmptyChart(['a', 'b'])
      expect(result.a).toEqual({ labels: [], series: [] })
      expect(result.b).toEqual({ labels: [], series: [] })
    })
  })

  describe('EMPTY_STRUCTURES', () => {
    it('has hashCosts and other sections', () => {
      expect(EMPTY_STRUCTURES.hashCosts).toBeDefined()
      expect(EMPTY_STRUCTURES.hashRevenues).toBeDefined()
      expect(EMPTY_STRUCTURES.operations).toBeDefined()
    })
  })
})
