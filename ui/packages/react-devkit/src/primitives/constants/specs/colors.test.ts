import { describe, expect, it } from 'vitest'

import {
  ATTENTION_LEVEL_COLORS,
  BAR_CHART_ITEM_BORDER_COLORS,
  CATEGORICAL_COLORS,
  CHART_COLORS,
  COLOR,
  HEATMAP,
  PIE_CHART_COLORS,
  SOCKET_BORDER_COLOR,
  TABLE_COLORS,
  TEMPERATURE_COLORS,
} from '../colors'

describe('cOLOR', () => {
  it('defines base colors', () => {
    expect(COLOR.WHITE).toBe('#FFFFFF')
    expect(COLOR.BLACK).toBe('#17130F')
    expect(COLOR.TRANSPARENT).toBe('transparent')
  })

  it('defines alpha variations', () => {
    expect(COLOR.WHITE_ALPHA_01).toBe('#FFFFFF1A')
    expect(COLOR.WHITE_ALPHA_05).toBe('#FFFFFF80')
    expect(COLOR.BLACK_ALPHA_03).toBe('#0000004D')
  })

  it('defines primary palette', () => {
    expect(COLOR.ORANGE).toBe('#FF6A00')
    expect(COLOR.COLD_ORANGE).toBe('#F7931A')
    expect(COLOR.LIGHT_ORANGE).toBe('#f8931a')
  })

  it('defines status colors', () => {
    expect(COLOR.RED).toBe('#EF4444')
    expect(COLOR.GREEN).toBe('#72F59E')
    expect(COLOR.YELLOW).toBe('#FFC107')
    expect(COLOR.BLUE).toBe('#357AF6')
  })

  it('defines greys', () => {
    expect(COLOR.GRAY).toBe('#424242')
    expect(COLOR.GREY).toBe('#87888C')
    expect(COLOR.DARK_GREY).toBe('#9FA6AC')
  })
})

describe('tABLE_COLORS', () => {
  it('defines table color constants', () => {
    expect(TABLE_COLORS.BORDER).toBe('#5B5B5B')
    expect(TABLE_COLORS.BACKGROUND).toBe('#363636')
    expect(TABLE_COLORS.HEADER_BACKGROUND).toBe('#404040')
  })
})

describe('hEATMAP', () => {
  it('defines heatmap intensity colors', () => {
    expect(HEATMAP.LOW).toBe('#002ea3')
    expect(HEATMAP.LOW_MEDIUM).toBe('#00a35e')
    expect(HEATMAP.HIGH_MEDIUM).toBe('#e6e939')
    expect(HEATMAP.HIGH).toBe(COLOR.RED)
    expect(HEATMAP.UNKNOWN).toBe('#000000')
  })
})

describe('cHART_COLORS', () => {
  it('defines chart-specific colors', () => {
    expect(CHART_COLORS.blue).toBe(COLOR.BLUE)
    expect(CHART_COLORS.green).toBe(COLOR.GRASS_GREEN)
    expect(CHART_COLORS.red).toBe(COLOR.BRICK_RED)
    expect(CHART_COLORS.orange).toBe(COLOR.ORANGE)
    expect(CHART_COLORS.yellow).toBe(COLOR.YELLOW)
  })

  it('defines chart UI colors', () => {
    expect(CHART_COLORS.gridLine).toBe(COLOR.WHITE_ALPHA_012)
    expect(CHART_COLORS.legendLabel).toBe(COLOR.WHITE_ALPHA_07)
    expect(CHART_COLORS.axisTicks).toBe(COLOR.WHITE_ALPHA_06)
  })
})

describe('bAR_CHART_ITEM_BORDER_COLORS', () => {
  it('defines bar chart border colors', () => {
    expect(BAR_CHART_ITEM_BORDER_COLORS.RED).toBe('#FF4D4F')
    expect(BAR_CHART_ITEM_BORDER_COLORS.BLUE).toBe('#1890FF')
    expect(BAR_CHART_ITEM_BORDER_COLORS.GREEN).toBe(COLOR.GREEN)
    expect(BAR_CHART_ITEM_BORDER_COLORS.PURPLE).toBe('#6366F1')
  })
})

describe('pIE_CHART_COLORS', () => {
  it('exports pie chart color palette', () => {
    expect(PIE_CHART_COLORS).toHaveLength(5)
    expect(PIE_CHART_COLORS[0]).toBe(COLOR.BRICK_RED)
    expect(PIE_CHART_COLORS[1]).toBe(CHART_COLORS.LIGHT_BLUE)
  })
})

describe('tEMPERATURE_COLORS', () => {
  it('defines temperature range colors', () => {
    expect(TEMPERATURE_COLORS.COLD).toBe(COLOR.RED)
    expect(TEMPERATURE_COLORS.LIGHT_WARM).toBe(COLOR.GOLD)
    expect(TEMPERATURE_COLORS.EXPECTED).toBe(COLOR.GREEN)
    expect(TEMPERATURE_COLORS.WARM).toBe(COLOR.WHITE)
    expect(TEMPERATURE_COLORS.HOT).toBe(COLOR.ORANGE)
    expect(TEMPERATURE_COLORS.SUPERHOT).toBe(COLOR.RED)
  })
})

describe('sOCKET_BORDER_COLOR', () => {
  it('defines socket border states', () => {
    expect(SOCKET_BORDER_COLOR.ENABLED).toBe(COLOR.GREEN)
    expect(SOCKET_BORDER_COLOR.DISABLED).toBe(COLOR.LIGHT_GREY)
    expect(SOCKET_BORDER_COLOR.SELECTED).toBe(COLOR.YELLOW)
  })
})

describe('aTTENTION_LEVEL_COLORS', () => {
  it('defines attention level colors', () => {
    expect(ATTENTION_LEVEL_COLORS.REBOOT).toBe('#C90000')
    expect(ATTENTION_LEVEL_COLORS.SET_LED).toBe('#858585')
    expect(ATTENTION_LEVEL_COLORS.SWITCH_COOLING).toBe('#810000')
    expect(ATTENTION_LEVEL_COLORS.SWITCH_SOCKET).toBe('#007055')
    expect(ATTENTION_LEVEL_COLORS.SET_POWER_MODE).toBe('#A80000')
  })
})

describe('cATEGORICAL_COLORS', () => {
  it('exports 25 categorical colors', () => {
    expect(CATEGORICAL_COLORS).toHaveLength(25)
    expect(CATEGORICAL_COLORS[0]).toBe('#4489ff')
    expect(CATEGORICAL_COLORS[24]).toBe('#8c0007')
  })

  it('contains distinct color values', () => {
    const uniqueColors = new Set(CATEGORICAL_COLORS)
    expect(uniqueColors.size).toBe(25)
  })
})
