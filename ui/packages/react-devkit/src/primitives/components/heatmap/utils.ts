import type { HeatmapCell } from "./types"

/**
 * Derive the `{ min, max }` range from every finite cell value in the grid.
 * Returns `{ min: 0, max: 0 }` when there are no finite values.
 */
export const getHeatmapRange = (data: HeatmapCell[][]): { min: number; max: number } => {
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY

  for (const row of data) {
    for (const cell of row) {
      const value = cell?.value
      if (typeof value === "number" && Number.isFinite(value)) {
        if (value < min) min = value
        if (value > max) max = value
      }
    }
  }

  if (min === Number.POSITIVE_INFINITY) return { min: 0, max: 0 }
  return { min, max }
}
