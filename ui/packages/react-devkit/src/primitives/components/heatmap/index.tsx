import { forwardRef } from "react"

import { cn, getHeatmapColor, HEATMAP_FALLBACK_COLOR, HEATMAP_GRADIENT } from "../../utils"
import { HeatmapLegend } from "./heatmap-legend"
import type { HeatmapCell, HeatmapProps } from "./types"
import { getHeatmapRange } from "./utils"

import "./styles.scss"

const cellText = (cell: HeatmapCell): string => {
  if (cell.label !== undefined) return cell.label
  return cell.value === null ? "" : String(cell.value)
}

/**
 * Heatmap — a generic grid of value-coloured cells on a low→high gradient.
 *
 * Presentational and domain-agnostic: pass a row-major matrix of cells and an
 * optional `[min, max]` range (auto-derived otherwise). Use `renderCell` to
 * overlay domain content (socket borders, selection, tooltips) without forking
 * the primitive — the grid still owns each cell's background colour. Pair with
 * {@link HeatmapLegend} for a gradient scale.
 *
 * @example
 * ```tsx
 * <Heatmap
 *   data={[
 *     [{ value: 20 }, { value: 45 }],
 *     [{ value: 70 }, { value: null }],
 *   ]}
 *   showValues
 * />
 * ```
 * @category charts
 * @domain generic
 * @tier agent-ready
 */
export const Heatmap = forwardRef<HTMLDivElement, HeatmapProps>(
  (
    {
      data,
      min,
      max,
      colors = HEATMAP_GRADIENT,
      emptyColor = HEATMAP_FALLBACK_COLOR,
      showValues = false,
      renderCell,
      ariaLabel = "Heatmap",
      className,
    },
    ref,
  ) => {
    const range = getHeatmapRange(data)
    const lowerBound = min ?? range.min
    const upperBound = max ?? range.max
    const columnCount = data.reduce((widest, row) => Math.max(widest, row.length), 0)

    return (
      <div
        ref={ref}
        className={cn("mdk-heatmap", className)}
        role="img"
        aria-label={ariaLabel}
        style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
      >
        {data.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const color =
              cell.value === null
                ? emptyColor
                : getHeatmapColor(cell.value, lowerBound, upperBound, colors)

            return (
              <div
                key={cell.key ?? `${rowIndex}-${colIndex}`}
                className="mdk-heatmap__cell"
                style={{ backgroundColor: color }}
              >
                {renderCell
                  ? renderCell(cell, { color, row: rowIndex, col: colIndex })
                  : showValues && <span className="mdk-heatmap__value">{cellText(cell)}</span>}
              </div>
            )
          }),
        )}
      </div>
    )
  },
)
Heatmap.displayName = "Heatmap"

export { HeatmapLegend } from "./heatmap-legend"
export type {
  HeatmapCell,
  HeatmapCellContext,
  HeatmapLegendProps,
  HeatmapProps,
} from "./types"
