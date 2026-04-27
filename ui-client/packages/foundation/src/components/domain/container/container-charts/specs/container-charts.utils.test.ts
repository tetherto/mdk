import { describe, expect, it } from 'vitest'

import type { ChartDataset } from '../container-charts.types'
import { addChartLine, addDataPoint, getEmptySet, getLineColor } from '../container-charts.utils'

describe('container-charts.utils', () => {
  describe('getEmptySet', () => {
    it('returns chart dataset with label and borderColor', () => {
      const result = getEmptySet('My Series', '#ff0000')
      expect(result).toEqual({
        type: 'line',
        label: 'My Series',
        data: [],
        borderColor: '#ff0000',
        pointRadius: 1,
      })
    })
  })

  describe('addChartLine', () => {
    it('adds new line to target when prop does not exist', () => {
      const target: Record<string, ChartDataset> = {}
      addChartLine(target, 'temp', '#00ff00')
      expect(target.temp).toBeDefined()
      expect(target.temp?.label).toBe('temp')
      expect(target.temp?.borderColor).toBe('#00ff00')
      expect(target.temp?.data).toEqual([])
    })

    it('does not overwrite existing prop', () => {
      const target: Record<string, ChartDataset> = {
        temp: getEmptySet('Existing', '#000'),
      }
      addChartLine(target, 'temp', '#fff')
      expect(target.temp?.borderColor).toBe('#000')
    })
  })

  describe('getLineColor', () => {
    it('returns color at index when within length', () => {
      const color = getLineColor(0)
      expect(typeof color).toBe('string')
      expect(color.length).toBeGreaterThan(0)
    })

    it('wraps index with modulo when beyond length', () => {
      const cWrap = getLineColor(100)
      expect(typeof cWrap).toBe('string')
      expect(cWrap).toBeDefined()
    })
  })

  describe('addDataPoint', () => {
    it('pushes point when target has data and value is not nil', () => {
      const target = getEmptySet('S', '#0')
      addDataPoint(target, 42, 1000)
      expect(target.data).toHaveLength(1)
      expect(target.data[0]).toEqual({ x: 1000, y: 42 })
    })

    it('does not push when value is null', () => {
      const target = getEmptySet('S', '#0')
      addDataPoint(target, null, 1000)
      expect(target.data).toHaveLength(0)
    })

    it('does not push when value is undefined', () => {
      const target = getEmptySet('S', '#0')
      addDataPoint(target, undefined, 1000)
      expect(target.data).toHaveLength(0)
    })

    it('does nothing when target is undefined', () => {
      expect(() => addDataPoint(undefined, 1, 0)).not.toThrow()
    })
  })
})
