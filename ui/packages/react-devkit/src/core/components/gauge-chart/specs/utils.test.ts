import { describe, expect, it } from 'vitest'

import { GAUGE_CENTER_X, GAUGE_CENTER_Y, GAUGE_SEGMENT_FALLBACK_COLOR } from '../constants'
import {
  buildArcSegmentPath,
  clampToUnitRange,
  hexToRgb,
  polarToCartesian,
  resolveSegmentColors,
  rgbToHex,
} from '../utils'

describe('polarToCartesian', () => {
  it('returns the gauge center when radius is zero', () => {
    expect(polarToCartesian(0, 0)).toEqual({ x: GAUGE_CENTER_X, y: GAUGE_CENTER_Y })
    expect(polarToCartesian(0, Math.PI / 2)).toEqual({ x: GAUGE_CENTER_X, y: GAUGE_CENTER_Y })
  })

  it('places points to the right of center for angle 0', () => {
    const point = polarToCartesian(10, 0)
    expect(point.x).toBeCloseTo(110)
    expect(point.y).toBeCloseTo(100)
  })

  it('places points above the center for angle pi/2 (y axis is inverted in SVG)', () => {
    const point = polarToCartesian(10, Math.PI / 2)
    expect(point.x).toBeCloseTo(100)
    expect(point.y).toBeCloseTo(90)
  })

  it('places points to the left of center for angle pi', () => {
    const point = polarToCartesian(10, Math.PI)
    expect(point.x).toBeCloseTo(90)
    expect(point.y).toBeCloseTo(100)
  })

  it('places points below the center for angle -pi/2 (negative sin)', () => {
    const point = polarToCartesian(10, -Math.PI / 2)
    expect(point.x).toBeCloseTo(100)
    expect(point.y).toBeCloseTo(110)
  })
})

describe('buildArcSegmentPath', () => {
  it('produces a valid SVG path string with the expected commands', () => {
    const path = buildArcSegmentPath(10, 20, Math.PI, 0)

    expect(path.startsWith('M ')).toBe(true)
    expect(path.endsWith(' Z')).toBe(true)
    expect(path).toMatch(/M\s+[-\d.]+\s+[-\d.]+/)
    expect(path).toMatch(/A\s+20\s+20\s+0\s+0\s+1/)
    expect(path).toMatch(/L\s+[-\d.]+\s+[-\d.]+/)
    expect(path).toMatch(/A\s+10\s+10\s+0\s+0\s+0/)
  })

  it('uses the inner and outer radii in the arc commands', () => {
    const path = buildArcSegmentPath(7, 42, Math.PI, 0)
    expect(path).toContain('A 42 42')
    expect(path).toContain('A 7 7')
  })

  it('formats coordinate values to 3 decimal places', () => {
    const path = buildArcSegmentPath(10, 20, Math.PI / 3, Math.PI / 6)
    const numericMatches = path.match(/-?\d+\.\d+/g) ?? []
    expect(numericMatches.length).toBeGreaterThan(0)
    numericMatches.forEach((value) => {
      const decimalsPart = value.split('.')[1] ?? ''
      expect(decimalsPart).toHaveLength(3)
    })
  })

  it('plots the start of the outer arc on the left for a half-circle sweep', () => {
    const path = buildArcSegmentPath(10, 20, Math.PI, 0)
    expect(path).toMatch(/^M 80\.000 100\.000\b/)
  })

  describe('with rounded corners', () => {
    it('emits four small corner arcs of the requested radius', () => {
      const path = buildArcSegmentPath(40, 80, Math.PI / 2 + 0.5, Math.PI / 2 - 0.5, 8)
      // Expect 4 arc commands using `8 8` as the radii (one per corner).
      const cornerArcs = path.match(/A\s+8\s+8\b/g) ?? []
      expect(cornerArcs).toHaveLength(4)
    })

    it('keeps the outer/inner arc commands at their original radii', () => {
      const path = buildArcSegmentPath(40, 80, Math.PI / 2 + 0.5, Math.PI / 2 - 0.5, 8)
      expect(path).toContain('A 80 80')
      expect(path).toContain('A 40 40')
    })

    it('still starts and closes the path correctly', () => {
      const path = buildArcSegmentPath(40, 80, Math.PI / 2 + 0.5, Math.PI / 2 - 0.5, 8)
      expect(path.startsWith('M ')).toBe(true)
      expect(path.endsWith(' Z')).toBe(true)
    })

    it('clamps the corner radius so it never exceeds half the radial thickness', () => {
      // Thickness = 80 - 70 = 10, so corner radius is capped to 5 even though
      // we requested 20.
      const path = buildArcSegmentPath(70, 80, Math.PI / 2 + 0.5, Math.PI / 2 - 0.5, 20)
      expect(path).toMatch(/A\s+5\s+5\b/)
      expect(path).not.toMatch(/A\s+20\s+20\b/)
    })

    it('falls back to sharp corners when cornerRadius is omitted or zero', () => {
      const sharp = buildArcSegmentPath(10, 20, Math.PI, 0)
      const explicitZero = buildArcSegmentPath(10, 20, Math.PI, 0, 0)
      expect(explicitZero).toBe(sharp)
      // Sharp paths use exactly one outer arc, one inner arc and one straight
      // line — no extra corner arcs.
      expect(sharp.match(/A\s+\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\b/g)).toHaveLength(2)
    })
  })
})

describe('clampToUnitRange', () => {
  it.each([
    [0, 0],
    [1, 1],
    [0.5, 0.5],
    [0.0001, 0.0001],
    [0.9999, 0.9999],
  ])('returns %s unchanged when within [0, 1]', (input, expected) => {
    expect(clampToUnitRange(input)).toBe(expected)
  })

  it('clamps values below 0 to 0', () => {
    expect(clampToUnitRange(-0.5)).toBe(0)
    expect(clampToUnitRange(-1000)).toBe(0)
  })

  it('clamps values above 1 to 1', () => {
    expect(clampToUnitRange(1.5)).toBe(1)
    expect(clampToUnitRange(1000)).toBe(1)
  })

  it('returns 0 when given NaN', () => {
    expect(clampToUnitRange(Number.NaN)).toBe(0)
  })

  it('handles positive and negative infinity', () => {
    expect(clampToUnitRange(Number.POSITIVE_INFINITY)).toBe(1)
    expect(clampToUnitRange(Number.NEGATIVE_INFINITY)).toBe(0)
  })
})

describe('hexToRgb', () => {
  it.each([
    ['#ff0000', { r: 255, g: 0, b: 0 }],
    ['#00ff00', { r: 0, g: 255, b: 0 }],
    ['#0000ff', { r: 0, g: 0, b: 255 }],
    ['#000000', { r: 0, g: 0, b: 0 }],
    ['#ffffff', { r: 255, g: 255, b: 255 }],
    ['#aabbcc', { r: 170, g: 187, b: 204 }],
  ])('parses 6-digit hex %s', (hex, expected) => {
    expect(hexToRgb(hex)).toEqual(expected)
  })

  it('parses hex without a leading "#"', () => {
    expect(hexToRgb('ff8800')).toEqual({ r: 255, g: 136, b: 0 })
  })

  it('expands 3-digit shorthand to 6-digit hex', () => {
    expect(hexToRgb('#f00')).toEqual({ r: 255, g: 0, b: 0 })
    expect(hexToRgb('#abc')).toEqual({ r: 170, g: 187, b: 204 })
    expect(hexToRgb('fff')).toEqual({ r: 255, g: 255, b: 255 })
  })

  it('is case-insensitive', () => {
    expect(hexToRgb('#FFAA00')).toEqual(hexToRgb('#ffaa00'))
  })

  it('returns black for invalid hex lengths', () => {
    expect(hexToRgb('#ab')).toEqual({ r: 0, g: 0, b: 0 })
    expect(hexToRgb('#abcd')).toEqual({ r: 0, g: 0, b: 0 })
    expect(hexToRgb('#ff0000ee')).toEqual({ r: 0, g: 0, b: 0 })
  })

  it('returns black for invalid hex characters', () => {
    expect(hexToRgb('#gggggg')).toEqual({ r: 0, g: 0, b: 0 })
  })
})

describe('rgbToHex', () => {
  it.each([
    [{ r: 255, g: 0, b: 0 }, '#ff0000'],
    [{ r: 0, g: 255, b: 0 }, '#00ff00'],
    [{ r: 0, g: 0, b: 255 }, '#0000ff'],
    [{ r: 0, g: 0, b: 0 }, '#000000'],
    [{ r: 255, g: 255, b: 255 }, '#ffffff'],
    [{ r: 170, g: 187, b: 204 }, '#aabbcc'],
  ])('serialises %j as %s', (input, expected) => {
    expect(rgbToHex(input)).toBe(expected)
  })

  it('zero-pads small channel values to keep 6 hex characters', () => {
    expect(rgbToHex({ r: 1, g: 2, b: 3 })).toBe('#010203')
  })

  it('round-trips through hexToRgb', () => {
    const original = '#3a7bff'
    expect(rgbToHex(hexToRgb(original))).toBe(original)
  })
})

describe('resolveSegmentColors', () => {
  it('returns an all-fallback palette when the input is empty', () => {
    expect(resolveSegmentColors([], 4)).toEqual(
      Array.from({ length: 4 }, () => GAUGE_SEGMENT_FALLBACK_COLOR),
    )
  })

  it('returns the palette unchanged when its length matches the segment count', () => {
    const palette = ['#111111', '#222222', '#333333']
    expect(resolveSegmentColors(palette, 3)).toEqual(palette)
  })

  it('returns just the first palette colour when only one segment is requested', () => {
    expect(resolveSegmentColors(['#abcdef', '#fedcba'], 1)).toEqual(['#abcdef'])
  })

  it('falls back to the default colour for a single segment with an empty palette', () => {
    expect(resolveSegmentColors([], 1)).toEqual([GAUGE_SEGMENT_FALLBACK_COLOR])
  })

  it('linearly interpolates between the first and last palette colours', () => {
    const result = resolveSegmentColors(['#000000', '#ffffff'], 5)
    expect(result).toHaveLength(5)
    expect(result[0]).toBe('#000000')
    expect(result[4]).toBe('#ffffff')
    expect(result[2]).toBe('#808080')
  })

  it('only uses the first and last colours from the palette when interpolating', () => {
    const result = resolveSegmentColors(['#000000', '#ff00ff', '#ffffff'], 2)
    expect(result).toEqual(['#000000', '#ffffff'])
  })

  it('produces a monotonically progressing colour ramp', () => {
    const result = resolveSegmentColors(['#000000', '#ff0000'], 4)
    expect(result).toHaveLength(4)
    expect(result[0]).toBe('#000000')
    expect(result[3]).toBe('#ff0000')

    const redChannels = result.map((color) => hexToRgb(color).r)
    for (let i = 1; i < redChannels.length; i++) {
      expect(redChannels[i]).toBeGreaterThanOrEqual(redChannels[i - 1] as number)
    }
  })
})
