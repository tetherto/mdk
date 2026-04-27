import { describe, expect, it } from 'vitest'

import {
  CHART_LEGEND_OPACITY,
  CHART_PERFORMANCE,
  defaultChartColors,
  getChartAnimationConfig,
  getDataDecimationConfig,
  LABEL_TO_IGNORE,
} from '../charts'

describe('defaultChartColors', () => {
  it('exports default color palette', () => {
    expect(defaultChartColors).toHaveLength(5)
    expect(defaultChartColors[0]).toBe('hsl(25 95% 53%)')
    expect(defaultChartColors[1]).toBe('hsl(142 76% 64%)')
  })
})

describe('cHART_LEGEND_OPACITY', () => {
  it('defines opacity constants', () => {
    expect(CHART_LEGEND_OPACITY.VISIBLE).toBe(1)
    expect(CHART_LEGEND_OPACITY.HIDDEN).toBe(0.2)
    expect(CHART_LEGEND_OPACITY.FILL_HIDDEN).toBe(0.1)
  })
})

describe('cHART_PERFORMANCE', () => {
  it('defines performance thresholds', () => {
    expect(CHART_PERFORMANCE.LARGE_DATASET_THRESHOLD).toBe(100)
    expect(CHART_PERFORMANCE.DECIMATION_THRESHOLD).toBe(200)
    expect(CHART_PERFORMANCE.ANIMATION_DURATION).toBe(300)
    expect(CHART_PERFORMANCE.NO_ANIMATION_THRESHOLD).toBe(500)
    expect(CHART_PERFORMANCE.SKIP_PARSING).toBe(true)
    expect(CHART_PERFORMANCE.NORMALIZE_DATA).toBe(false)
  })
})

describe('lABEL_TO_IGNORE', () => {
  it('includes common label keys to ignore', () => {
    expect(LABEL_TO_IGNORE).toContain('label')
    expect(LABEL_TO_IGNORE).toContain('unit')
    expect(LABEL_TO_IGNORE).toContain('backgroundColor')
    expect(LABEL_TO_IGNORE).toContain('borderColor')
    expect(LABEL_TO_IGNORE).toContain('tension')
  })
})

describe('getChartAnimationConfig', () => {
  it('returns full animation for small datasets', () => {
    const result = getChartAnimationConfig(50)
    expect(result).toEqual({ duration: 300 })
  })

  it('returns no animation for medium datasets', () => {
    const result = getChartAnimationConfig(150)
    expect(result).toEqual({ duration: 0 })
  })

  it('returns false for large datasets', () => {
    const result = getChartAnimationConfig(600)
    expect(result).toBe(false)
  })

  it('handles threshold boundary at 100', () => {
    expect(getChartAnimationConfig(100)).toEqual({ duration: 300 })
    expect(getChartAnimationConfig(101)).toEqual({ duration: 0 })
  })

  it('handles threshold boundary at 500', () => {
    expect(getChartAnimationConfig(500)).toEqual({ duration: 0 })
    expect(getChartAnimationConfig(501)).toBe(false)
  })
})

describe('getDataDecimationConfig', () => {
  it('disables decimation for small datasets', () => {
    const result = getDataDecimationConfig(100)
    expect(result).toEqual({ enabled: false })
  })

  it('enables decimation with lttb algorithm for large datasets', () => {
    const result = getDataDecimationConfig(300)
    expect(result).toEqual({ enabled: true, algorithm: 'lttb' })
  })

  it('handles threshold boundary at 200', () => {
    expect(getDataDecimationConfig(200)).toEqual({ enabled: false })
    expect(getDataDecimationConfig(201)).toEqual({ enabled: true, algorithm: 'lttb' })
  })
})
