/**
 * Converts a hex color to rgba format with specified opacity
 * Supports:
 *  - #RGB
 *  - #RRGGBB
 *  - RGB / RRGGBB (without #)
 */
export const hexToRgba = (hex: string, opacity: number = 1): string => {
  if (typeof hex !== 'string') {
    throw new TypeError('hexToRgba: hex must be a string')
  }

  // Clamp opacity between 0 and 1
  const alpha = Math.min(1, Math.max(0, opacity))

  let sanitized = hex.trim().replace(/^#/, '')

  // Handle shorthand (#fff → #ffffff)
  if (sanitized.length === 3) {
    sanitized = sanitized
      .split('')
      .map((char) => char + char)
      .join('')
  }

  if (!/^[0-9a-f]{6}$/i.test(sanitized)) {
    console.warn(`hexToRgba: Invalid hex color "${hex}"`)
    return hex
  }

  const num = Number.parseInt(sanitized, 16)

  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export type RgbColor = { r: number; g: number; b: number }

/**
 * Parse a hex color (`#RGB` / `#RRGGBB`, with or without `#`) into RGB
 * channels. Returns black for malformed input rather than throwing, so it is
 * safe to feed user-supplied palette values.
 */
export const hexToRgb = (hex: string): RgbColor => {
  const sanitizedRaw = typeof hex === 'string' ? hex.trim().replace(/^#/, '') : ''
  const sanitized =
    sanitizedRaw.length === 3
      ? sanitizedRaw
          .split('')
          .map((char) => char + char)
          .join('')
      : sanitizedRaw

  if (!/^[0-9a-f]{6}$/i.test(sanitized)) {
    return { r: 0, g: 0, b: 0 }
  }

  const num = Number.parseInt(sanitized, 16)
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

/** Serialise RGB channels back to a `#RRGGBB` hex string. */
export const rgbToHex = ({ r, g, b }: RgbColor): string => {
  const clamp = (channel: number): number => Math.max(0, Math.min(255, Math.round(channel)))
  const value = (clamp(r) << 16) | (clamp(g) << 8) | clamp(b)
  return `#${value.toString(16).padStart(6, '0')}`
}

/**
 * Default cold→hot heatmap gradient (blue → green → yellow → red), ported from
 * the operator app's `HEATMAP` palette. Ordered low value → high value.
 *
 * @tier internal
 */
export const HEATMAP_GRADIENT = ['#002ea3', '#00a35e', '#e6e939', '#c0392b'] as const

/**
 * Colour returned when a value or the range is not finite.
 *
 * @tier internal
 */
export const HEATMAP_FALLBACK_COLOR = '#000000'

/**
 * Map a numeric value to a colour on an evenly-spaced multi-stop gradient,
 * clamped to `[min, max]`. Generalises the operator app's temperature-colour
 * helper: values ≤ min take the first stop, values ≥ max the last, and values
 * in between are linearly interpolated between the two surrounding stops.
 *
 * @param value   the sample to colour
 * @param min     range floor (maps to `stops[0]`)
 * @param max     range ceiling (maps to the last stop)
 * @param stops   gradient colours low→high (defaults to {@link HEATMAP_GRADIENT})
 */
export const getHeatmapColor = (
  value: number,
  min: number,
  max: number,
  stops: readonly string[] = HEATMAP_GRADIENT,
): string => {
  if (stops.length === 0) return HEATMAP_FALLBACK_COLOR
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) {
    return HEATMAP_FALLBACK_COLOR
  }
  if (stops.length === 1 || max <= min || value >= max) return stops[stops.length - 1] as string
  if (value <= min) return stops[0] as string

  const position = ((value - min) / (max - min)) * (stops.length - 1)
  const lowerIndex = Math.floor(position)
  const fraction = position - lowerIndex
  const lower = hexToRgb(stops[lowerIndex] as string)
  const upper = hexToRgb(stops[lowerIndex + 1] as string)

  return rgbToHex({
    r: lower.r + (upper.r - lower.r) * fraction,
    g: lower.g + (upper.g - lower.g) * fraction,
    b: lower.b + (upper.b - lower.b) * fraction,
  })
}
