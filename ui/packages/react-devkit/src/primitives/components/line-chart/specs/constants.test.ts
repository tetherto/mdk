import { describe, expect, it } from 'vitest'

import {
  CHART_COLORS,
  GAP,
  MARGIN_ABOVE_FACTOR,
  MARGIN_BELOW_FACTOR,
  OFFSET,
  SCALE_MIN_PADDING,
  SCALE_PADDING_FACTOR_FOR_FLOAT,
  SCALE_PADDING_FACTOR_FOR_INT,
  TOOLTIP_DEFAULT_OFFSET,
  VISIBLE_POINTS_BY_TIMELINE,
} from '../line-chart.constants'

describe('tOOLTIP_DEFAULT_OFFSET', () => {
  it('defines default tooltip offset', () => {
    expect(TOOLTIP_DEFAULT_OFFSET).toBe(10)
  })
})

describe('sCALE_PADDING_FACTOR_FOR_INT', () => {
  it('defines padding factor for integers', () => {
    expect(SCALE_PADDING_FACTOR_FOR_INT).toBe(0.04)
  })
})

describe('sCALE_PADDING_FACTOR_FOR_FLOAT', () => {
  it('defines padding factor for floats', () => {
    expect(SCALE_PADDING_FACTOR_FOR_FLOAT).toBe(0.02)
  })
})

describe('sCALE_MIN_PADDING', () => {
  it('defines minimum padding value', () => {
    expect(SCALE_MIN_PADDING).toBe(1.2)
  })
})

describe('mARGIN_ABOVE_FACTOR', () => {
  it('defines margin above chart', () => {
    expect(MARGIN_ABOVE_FACTOR).toBe(0.3)
  })
})

describe('mARGIN_BELOW_FACTOR', () => {
  it('defines margin below chart', () => {
    expect(MARGIN_BELOW_FACTOR).toBe(0.2)
  })
})

describe('gAP', () => {
  it('defines gap constant', () => {
    expect(GAP).toBe(20)
  })
})

describe('oFFSET', () => {
  it('defines offset constant', () => {
    expect(OFFSET).toBe(5)
  })
})

describe('vISIBLE_POINTS_BY_TIMELINE', () => {
  it('defines visible points for each timeline', () => {
    expect(VISIBLE_POINTS_BY_TIMELINE['1m']).toBe(15)
    expect(VISIBLE_POINTS_BY_TIMELINE['5m']).toBe(12)
    expect(VISIBLE_POINTS_BY_TIMELINE['30m']).toBe(12)
    expect(VISIBLE_POINTS_BY_TIMELINE['3h']).toBe(12)
    expect(VISIBLE_POINTS_BY_TIMELINE['1D']).toBe(14)
  })

  it('has exactly 5 timeline entries', () => {
    expect(Object.keys(VISIBLE_POINTS_BY_TIMELINE)).toHaveLength(5)
  })
})

describe('cHART_COLORS', () => {
  it('defines chart color constants', () => {
    expect(CHART_COLORS.EBONY).toBe('#0f0f0f')
    expect(CHART_COLORS.WHITE_ALPHA_01).toBe('#FFFFFF1A')
    expect(CHART_COLORS.WHITE_ALPHA_02).toBe('#FFFFFF33')
    expect(CHART_COLORS.WHITE_ALPHA_06).toBe('#FFFFFF99')
  })

  it('has exactly 4 color entries', () => {
    expect(Object.keys(CHART_COLORS)).toHaveLength(4)
  })
})
