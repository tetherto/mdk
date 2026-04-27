export const COLOR = {
  // Base
  DARK_BACK: '#1A1815',
  WHITE: '#FFFFFF',
  SIMPLE_BLACK: '#000000',
  TRANSPARENT_WHITE: '#FFFFFF80',
  TRANSPARENT_BLACK: '#0000000A',
  BLACK: '#17130F',
  BLACK_ALPHA_03: '#0000004D',
  BLACK_ALPHA_05: '#00000080',
  DARK_BLACK: '#10100F',
  JET_BLACK: '#070707',
  RICH_BLACK: '#0b0b0b',
  EBONY: '#0f0f0f',
  OBSIDIAN: '#161514',
  WHITE_ALPHA_01: '#FFFFFF1A',
  WHITE_ALPHA_012: '#ffffff1f',
  WHITE_ALPHA_02: '#FFFFFF33',
  WHITE_ALPHA_04: '#FFFFFF40',
  WHITE_ALPHA_05: '#FFFFFF80',
  WHITE_ALPHA_06: '#FFFFFF99',
  WHITE_ALPHA_07: '#ffffffb3',
  WHITE_ALPHA_08: '#FFFFFFCC',
  WHITE_ALPHA_005: '#FFFFFF0D',
  WHITE_ALPHA_021: '#ffffff21',
  WHITE_ALPHA_026: '#FFFFFF26',
  DARK: '#0E0E0E',
  LIGHT: '#E5E7EB',
  TRANSPARENT: 'transparent',
  SOFT_TEAL: '#0093934D',
  // Primary palette
  LIGHT_ORANGE: '#f8931a',
  ORANGE: '#FF6A00',
  DARK_ORANGE: '#261b0f',
  COLD_ORANGE: '#F7931A',
  ALPHA_COLD_ORANGE_08: '#F7931ACC',
  COLD_ORANGE_ALPHA_02: '#F7931A33',
  ORANGE_HOVER: '#c4730f',
  ORANGE_BORDER: '#f7931a80',
  SLATE_GRAY: '#9CA3AF',
  DARK_CHOCOLATE: '#422006',
  FROST_GRAY: '#e5e7eb',
  SOFT_APRICOT: '#ffecba',

  // Status
  RED: '#EF4444',
  DARK_RED: '#251313',
  BRICK_RED: '#FF3B30',
  BRIGHT_RED: '#FF4444', // Accessible red for alerts (WCAG AA compliant)
  GREEN: '#72F59E',
  DARK_GREEN: '#18251c',
  LIGHT_GREEN: '#52C41A',
  GRASS_GREEN: '#34C759',
  EMERALD: '#009393',
  BRIGHT_YELLOW: '#EAB308',
  YELLOW: '#FFC107',
  GOLD: '#FFD700', // Accessible yellow for alerts (WCAG AA compliant)
  DARK_YELLOW: '#251c0e',
  AGED_YELLOW: '#98887333',
  YELLOW_DARK: '#C5A600',
  ORANGE_WARNING: '#F59E0B',
  DARK_ORANGE_ACCESSIBLE: '#FF8C00', // Accessible orange for alerts (WCAG AA compliant)
  RESET_YELLOW: '#B5A40D',
  STRONG_GREEN: '#03C04A',
  LIGHT_BLUE: '#22AFFF',
  MEDIUM_BLUE: '#4289C1',
  SLEEP_BLUE: '#3B82F6',
  INDIGO: '#5B5FFB',
  MINT_GREEN: '#6EE7B7',
  POOL: '#00D0D8',
  OCEAN_GREEN: '#3AFFF2',
  BLUE_SEA: '#14B8A6',
  DARK_TEXT_GREEN: '#008000',
  ORANGE_DIMMEST: '#1D1914',
  BRIGHT_GREEN: '#72F69E',
  GREY_IDLE: '#6B7280',
  SOCKET_ON_GREEN: '#2C5B3C',
  LOW_YELLOW: '#F6EE5C',
  PURPLE_HIGH: '#8B5CF6',

  // Greys
  GRAY: '#424242',
  GREY: '#87888C',
  DARK_GREY: '#9FA6AC',
  DARKER_GREY: '#404040',
  LIGHT_GREY: '#D9D9D9',

  // UI surfaces
  ONYX: '#141414',
  CARD_BODY_TEXT: '#DEB7B7',
  CARD_SUBTITLE_TEXT: '#9F9E9E',
  ICON_GREY: '#BFBFBF',
  ICON_WRAPPER_GREY: '#FFFFFF1A',
  BLUE: '#357AF6',

  // Sidebar
  SIDEBAR_ACTIVE_ITEM: '#F7931A',
  SIDEBAR_ITEM: '#898887',

  // Table
  SELECTED_ITEM_GREY: '#2D2D2D',
} as const

export const TABLE_COLORS = {
  BORDER: '#5B5B5B',
  BACKGROUND: '#363636',
  HEADER_BACKGROUND: '#404040',
} as const

export const HEATMAP = {
  LOW: '#002ea3',
  LOW_MEDIUM: '#00a35e',
  HIGH_MEDIUM: '#e6e939',
  HIGH: COLOR.RED,
  UNKNOWN: '#000000',
} as const

export const CHART_COLORS = {
  AGGR_POOL: COLOR.BLUE, // Blue tone from brand palette
  OCEAN: COLOR.BRICK_RED, // Strong red tone
  SKY_BLUE: '#59E8E8',
  LIGHT_BLUE: COLOR.LIGHT_BLUE,
  METALLIC_BLUE: '#23497A',
  green: COLOR.GRASS_GREEN,
  red: COLOR.BRICK_RED,
  BLACK: COLOR.BLACK,
  blue: COLOR.BLUE,
  VIOLET: '#867DF9',
  yellow: COLOR.YELLOW,
  secondaryYellow: COLOR.YELLOW,
  purple: '#A020F0',
  orange: COLOR.ORANGE,
  secondaryOrange: COLOR.COLD_ORANGE,
  grey: COLOR.GREY,
  white: COLOR.WHITE,
  gridLine: COLOR.WHITE_ALPHA_012,
  legendLabel: COLOR.WHITE_ALPHA_07,
  axisTicks: COLOR.WHITE_ALPHA_06,
} as const

export const BAR_CHART_ITEM_BORDER_COLORS = {
  RED: '#FF4D4F',
  BLUE: '#1890FF',
  LIGHT_BLUE: '#06B6D4',
  SKY_BLUE: CHART_COLORS.SKY_BLUE,
  METALLIC_BLUE: CHART_COLORS.METALLIC_BLUE,
  PURPLE: '#6366F1',
  GREEN: COLOR.GREEN,
  BLUE_SEA: COLOR.BLUE_SEA,
  YELLOW: COLOR.COLD_ORANGE,
  VIOLET: '#8B5CF6',
  ORANGE: CHART_COLORS.orange,
} as const

export const PIE_CHART_COLORS = [
  COLOR.BRICK_RED,
  CHART_COLORS.LIGHT_BLUE,
  CHART_COLORS.secondaryYellow,
  CHART_COLORS.secondaryOrange,
  COLOR.GRASS_GREEN,
] as const

export const TEMPERATURE_COLORS = {
  COLD: COLOR.RED,
  LIGHT_WARM: COLOR.GOLD,
  EXPECTED: COLOR.GREEN,
  WARM: COLOR.WHITE,
  HOT: COLOR.ORANGE,
  SUPERHOT: COLOR.RED,
} as const

export const SOCKET_BORDER_COLOR = {
  ENABLED: COLOR.GREEN,
  DISABLED: COLOR.LIGHT_GREY,
  SELECTED: COLOR.YELLOW,
} as const

export const ATTENTION_LEVEL_COLORS = {
  REBOOT: '#C90000',
  SET_LED: '#858585',
  SWITCH_COOLING: '#810000',
  SWITCH_SOCKET: '#007055',
  SET_POWER_MODE: '#A80000',
} as const

// Generated from https://medialab.github.io/iwanthue/
export const CATEGORICAL_COLORS = [
  '#4489ff',
  '#df7aff',
  '#6b007f',
  '#8ecf00',
  '#ff4c4c',
  '#02eebc',
  '#ff7f99',
  '#c3ff66',
  '#a900a6',
  '#011c74',
  '#01d143',
  '#600001',
  '#430061',
  '#aa5200',
  '#4c00d7',
  '#fff59a',
  '#337900',
  '#78ffd4',
  '#90b05f',
  '#8fff90',
  '#9ea400',
  '#5254ff',
  '#00b03b',
  '#009850',
  '#8c0007',
]

// Type exports
export type ColorKey = keyof typeof COLOR
export type HeatmapKey = keyof typeof HEATMAP
export type ColorValue = (typeof COLOR)[ColorKey]
export type ChartColorKey = keyof typeof CHART_COLORS
export type TableColorKey = keyof typeof TABLE_COLORS
export type TemperatureColorKey = keyof typeof TEMPERATURE_COLORS
export type SocketBorderColorKey = keyof typeof SOCKET_BORDER_COLOR
export type AttentionLevelColorKey = keyof typeof ATTENTION_LEVEL_COLORS
export type BarChartItemBorderColorKey = keyof typeof BAR_CHART_ITEM_BORDER_COLORS
