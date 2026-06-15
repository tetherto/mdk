export const TOOLTIP_DEFAULT_OFFSET = 10

export const SCALE_PADDING_FACTOR_FOR_INT = 0.04
export const SCALE_PADDING_FACTOR_FOR_FLOAT = 0.02

export const SCALE_MIN_PADDING = 1.2

export const MARGIN_ABOVE_FACTOR = 0.3
export const MARGIN_BELOW_FACTOR = 0.2

export const GAP = 20
export const OFFSET = 5

export const VISIBLE_POINTS_BY_TIMELINE: Record<string, number> = {
  '1m': 15,
  '5m': 12,
  '30m': 12,
  '3h': 12,
  '1D': 14,
}

export const CHART_COLORS = {
  EBONY: '#0f0f0f',
  WHITE_ALPHA_01: '#FFFFFF1A',
  WHITE_ALPHA_02: '#FFFFFF33',
  WHITE_ALPHA_06: '#FFFFFF99',
}

// Line chart card constants
export const CHART_MIN_HEIGHT = 400
export const DEFAULT_QUERY_LIMIT = 288

const TIMELINE_CONFIG = {
  '20s': { ms: 20 * 1000, format: 'HH:mm:ss' },
  '1m': { ms: 60 * 1000, format: 'HH:mm' },
  '5m': { ms: 5 * 60 * 1000, format: 'HH:mm' },
  '30m': { ms: 30 * 60 * 1000, format: 'HH:mm' },
  '1h': { ms: 60 * 60 * 1000, format: 'HH:mm' },
  '3h': { ms: 3 * 60 * 60 * 1000, format: 'HH:mm' },
  '1D': { ms: 24 * 60 * 60 * 1000, format: 'MMM dd' },
} as const

export type Timeline = keyof typeof TIMELINE_CONFIG

const DEFAULT_TIMELINE_CONFIG = { ms: 60 * 60 * 1000, format: 'HH:mm' } as const

const getTimeline = (timeline: string) =>
  TIMELINE_CONFIG[timeline as Timeline] ?? DEFAULT_TIMELINE_CONFIG

export const timelineToMs = (timeline: string): number => getTimeline(timeline).ms

export const getTimelineDateFormat = (timeline: string): string => getTimeline(timeline).format
