import {
  GAUGE_CENTER_X,
  GAUGE_CENTER_Y,
  GAUGE_SEGMENT_FALLBACK_COLOR,
  HEX_DIGITS_REGEX,
  LEADING_HASH_REGEX,
  LONG_HEX_LENGTH,
  SHORT_HEX_LENGTH,
} from './constants'
import type { CartesianPoint, RgbColor } from './types'
import _size from 'lodash/size'

export const polarToCartesian = (radius: number, angleRadians: number): CartesianPoint => ({
  x: GAUGE_CENTER_X + radius * Math.cos(angleRadians),
  y: GAUGE_CENTER_Y - radius * Math.sin(angleRadians),
})

/**
 * Build an SVG path for a single ring segment between two angles.
 * `startAngle` > `endAngle` (we sweep clockwise across the top of the gauge).
 *
 * When `cornerRadius > 0` the four corners of the segment are rounded with
 * tangent arcs of that radius (the radius is automatically clamped so it
 * never exceeds half the radial thickness or half the angular span).
 */
export const buildArcSegmentPath = (
  innerRadius: number,
  outerRadius: number,
  startAngleRadians: number,
  endAngleRadians: number,
  cornerRadius: number = 0,
): string => {
  const angularSpan = startAngleRadians - endAngleRadians
  const radialThickness = outerRadius - innerRadius

  const safeCornerRadius = Math.max(
    0,
    Math.min(
      cornerRadius,
      radialThickness / 2,
      // The corner uses ~`cornerRadius` of arc length on each side, so cap by
      // half of the *inner* arc length (the most constrained side).
      (innerRadius * angularSpan) / 2,
    ),
  )

  const fmt = (value: number): string => value.toFixed(3)

  if (safeCornerRadius === 0) {
    const outerStart = polarToCartesian(outerRadius, startAngleRadians)
    const outerEnd = polarToCartesian(outerRadius, endAngleRadians)
    const innerStart = polarToCartesian(innerRadius, endAngleRadians)
    const innerEnd = polarToCartesian(innerRadius, startAngleRadians)

    return [
      `M ${fmt(outerStart.x)} ${fmt(outerStart.y)}`,
      `A ${outerRadius} ${outerRadius} 0 0 1 ${fmt(outerEnd.x)} ${fmt(outerEnd.y)}`,
      `L ${fmt(innerStart.x)} ${fmt(innerStart.y)}`,
      `A ${innerRadius} ${innerRadius} 0 0 0 ${fmt(innerEnd.x)} ${fmt(innerEnd.y)}`,
      'Z',
    ].join(' ')
  }

  const outerAngularInset = safeCornerRadius / outerRadius
  const innerAngularInset = safeCornerRadius / innerRadius

  const outerArcStart = polarToCartesian(outerRadius, startAngleRadians - outerAngularInset)
  const outerArcEnd = polarToCartesian(outerRadius, endAngleRadians + outerAngularInset)
  const topRightOnRadial = polarToCartesian(outerRadius - safeCornerRadius, endAngleRadians)
  const bottomRightOnRadial = polarToCartesian(innerRadius + safeCornerRadius, endAngleRadians)
  const innerArcStart = polarToCartesian(innerRadius, endAngleRadians + innerAngularInset)
  const innerArcEnd = polarToCartesian(innerRadius, startAngleRadians - innerAngularInset)
  const bottomLeftOnRadial = polarToCartesian(innerRadius + safeCornerRadius, startAngleRadians)
  const topLeftOnRadial = polarToCartesian(outerRadius - safeCornerRadius, startAngleRadians)

  return [
    `M ${fmt(outerArcStart.x)} ${fmt(outerArcStart.y)}`,
    `A ${outerRadius} ${outerRadius} 0 0 1 ${fmt(outerArcEnd.x)} ${fmt(outerArcEnd.y)}`,
    `A ${safeCornerRadius} ${safeCornerRadius} 0 0 1 ${fmt(topRightOnRadial.x)} ${fmt(topRightOnRadial.y)}`,
    `L ${fmt(bottomRightOnRadial.x)} ${fmt(bottomRightOnRadial.y)}`,
    `A ${safeCornerRadius} ${safeCornerRadius} 0 0 1 ${fmt(innerArcStart.x)} ${fmt(innerArcStart.y)}`,
    `A ${innerRadius} ${innerRadius} 0 0 0 ${fmt(innerArcEnd.x)} ${fmt(innerArcEnd.y)}`,
    `A ${safeCornerRadius} ${safeCornerRadius} 0 0 1 ${fmt(bottomLeftOnRadial.x)} ${fmt(bottomLeftOnRadial.y)}`,
    `L ${fmt(topLeftOnRadial.x)} ${fmt(topLeftOnRadial.y)}`,
    `A ${safeCornerRadius} ${safeCornerRadius} 0 0 1 ${fmt(outerArcStart.x)} ${fmt(outerArcStart.y)}`,
    'Z',
  ].join(' ')
}

export const clampToUnitRange = (value: number): number => {
  if (Number.isNaN(value)) return 0

  return Math.max(0, Math.min(1, value))
}

export const hexToRgb = (hex: string): RgbColor => {
  const normalized = hex.trim().replace(LEADING_HASH_REGEX, '')
  const normalizedSize = _size(normalized)
  const isShortHex = normalizedSize === SHORT_HEX_LENGTH
  const isLongHex = normalizedSize === LONG_HEX_LENGTH

  if (!(isShortHex || isLongHex) || !HEX_DIGITS_REGEX.test(normalized)) {
    return { r: 0, g: 0, b: 0 }
  }

  const expanded = isShortHex
    ? normalized
        .split('')
        .map((char) => char + char)
        .join('')
    : normalized
  const numericValue = Number.parseInt(expanded, 16)

  return {
    r: (numericValue >> 16) & 255,
    g: (numericValue >> 8) & 255,
    b: numericValue & 255,
  }
}

export const rgbToHex = ({ r, g, b }: RgbColor): string => {
  const hex = ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')
  return `#${hex}`
}

export const resolveSegmentColors = (palette: string[], segmentCount: number): string[] => {
  if (_size(palette) === 0) {
    return Array.from({ length: segmentCount }, () => GAUGE_SEGMENT_FALLBACK_COLOR)
  }

  if (_size(palette) === segmentCount) {
    return palette
  }

  if (segmentCount === 1) {
    return [palette[0] ?? GAUGE_SEGMENT_FALLBACK_COLOR]
  }

  const startColor = hexToRgb(palette[0] ?? GAUGE_SEGMENT_FALLBACK_COLOR)
  const endColor = hexToRgb(palette[_size(palette) - 1] ?? GAUGE_SEGMENT_FALLBACK_COLOR)

  return Array.from({ length: segmentCount }, (_, index) => {
    const interpolation = index / (segmentCount - 1)

    return rgbToHex({
      r: Math.round(startColor.r + (endColor.r - startColor.r) * interpolation),
      g: Math.round(startColor.g + (endColor.g - startColor.g) * interpolation),
      b: Math.round(startColor.b + (endColor.b - startColor.b) * interpolation),
    })
  })
}

export const easeOutCubic = (time: number): number => 1 - (1 - time) ** 3
