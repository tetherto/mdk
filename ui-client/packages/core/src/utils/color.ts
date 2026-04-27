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
