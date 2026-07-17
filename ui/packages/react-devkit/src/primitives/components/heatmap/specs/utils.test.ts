import { describe, expect, it } from "vitest"

import { getHeatmapColor, HEATMAP_FALLBACK_COLOR, HEATMAP_GRADIENT } from "../../../utils"
import { getHeatmapRange } from "../utils"

describe("getHeatmapRange", () => {
  it("derives min/max from finite values and ignores null", () => {
    expect(
      getHeatmapRange([
        [{ value: 20 }, { value: 45 }],
        [{ value: null }, { value: 70 }],
      ]),
    ).toEqual({ min: 20, max: 70 })
  })

  it("returns a zero range when there are no finite values", () => {
    expect(getHeatmapRange([[{ value: null }], []])).toEqual({ min: 0, max: 0 })
  })
})

describe("getHeatmapColor", () => {
  it("returns the first stop at or below min and the last stop at or above max", () => {
    expect(getHeatmapColor(0, 0, 100)).toBe(HEATMAP_GRADIENT[0])
    expect(getHeatmapColor(-10, 0, 100)).toBe(HEATMAP_GRADIENT[0])
    expect(getHeatmapColor(100, 0, 100)).toBe(HEATMAP_GRADIENT[HEATMAP_GRADIENT.length - 1])
    expect(getHeatmapColor(150, 0, 100)).toBe(HEATMAP_GRADIENT[HEATMAP_GRADIENT.length - 1])
  })

  it("lands exactly on an interior stop", () => {
    // 4 stops → interior stops at 1/3 and 2/3 of the range.
    expect(getHeatmapColor(100 / 3, 0, 100)).toBe(HEATMAP_GRADIENT[1])
  })

  it("interpolates between two stops", () => {
    const midway = getHeatmapColor(50, 0, 100, ["#000000", "#ffffff"])
    expect(midway.toLowerCase()).toBe("#808080")
  })

  it("falls back for non-finite input or an empty palette", () => {
    expect(getHeatmapColor(Number.NaN, 0, 100)).toBe(HEATMAP_FALLBACK_COLOR)
    expect(getHeatmapColor(50, 0, 100, [])).toBe(HEATMAP_FALLBACK_COLOR)
  })

  it("returns the single stop when only one is provided", () => {
    expect(getHeatmapColor(50, 0, 100, ["#123456"])).toBe("#123456")
  })
})
