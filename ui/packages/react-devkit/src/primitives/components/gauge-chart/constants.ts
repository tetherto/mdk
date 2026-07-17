import { COLOR } from '../../constants'

export const GAUGE_VIEWBOX_WIDTH = 200 // in pixels
export const GAUGE_VIEWBOX_HEIGHT = 108 // in pixels

export const GAUGE_CENTER_X = 100 // in pixels
export const GAUGE_CENTER_Y = 100 // in pixels

export const GAUGE_OUTER_RADIUS = 90 // in pixels

export const GAUGE_SEGMENT_PADDING_RADIANS = 0.04
export const GAUGE_SEGMENT_CORNER_RADIUS = 4 // in pixels

export const GAUGE_NEEDLE_HUB_RADIUS = 8 // in pixels
export const GAUGE_NEEDLE_TIP_INSET = 20 // in pixels
export const GAUGE_NEEDLE_SWEEP_DURATION_MS = 900

export const GAUGE_PERCENT_LABEL_FONT_SIZE = 22 // in pixels
export const GAUGE_PERCENT_LABEL_VERTICAL_OFFSET = -40 // in pixels

export const DEFAULT_GAUGE_NEEDLE_COLOR = COLOR.STEEL_GRAY
export const DEFAULT_GAUGE_TEXT_COLOR = COLOR.WHITE
export const GAUGE_SEGMENT_FALLBACK_COLOR = COLOR.GREY

export const GAUGE_DEFAULT_HEIGHT = 200 // in pixels
export const GAUGE_DEFAULT_MAX_WIDTH = 500 // in pixels
export const GAUGE_DEFAULT_NR_OF_LEVELS = 3 // number of arc segments
export const GAUGE_DEFAULT_ARC_WIDTH = 0.2 // arc thickness as a fraction of the gauge radius (0–1)
export const GAUGE_DEFAULT_COLORS = [COLOR.GREEN, COLOR.SOFT_GREEN, COLOR.RED]

export const HEX_DIGITS_REGEX = /^[\da-f]+$/i // regex to match a hex color
export const LEADING_HASH_REGEX = /^#/ // regex to match a leading hash symbol
export const SHORT_HEX_LENGTH = 3
export const LONG_HEX_LENGTH = 6
