import type { ReactNode } from 'react'

/** A single heatmap cell. */
export type HeatmapCell = {
  /** Numeric value driving the cell colour; `null` renders the empty colour. */
  value: number | null
  /** Text shown in the cell (defaults to the value when `showValues` is on). */
  label?: string
  /** Stable React key (defaults to the row/column index). */
  key?: string
}

/** Context handed to `renderCell` for a single cell. */
export type HeatmapCellContext = {
  /** The colour resolved for this cell from the gradient (or the empty colour). */
  color: string
  /** Zero-based row index. */
  row: number
  /** Zero-based column index. */
  col: number
}

export type HeatmapProps = {
  /** Rows of cells (row-major). Rows may be ragged. */
  data: HeatmapCell[][]
  /**
   * Range floor (maps to the first gradient stop); auto-derived from the finite values when omitted.
   * @default auto
   */
  min?: number
  /**
   * Range ceiling (maps to the last gradient stop); auto-derived from the finite values when omitted.
   * @default auto
   */
  max?: number
  /**
   * Gradient stops low→high. Defaults to the cold→hot `HEATMAP_GRADIENT`.
   * @default HEATMAP_GRADIENT
   */
  colors?: readonly string[]
  /**
   * Colour used for `null` cells.
   * @default #000000
   */
  emptyColor?: string
  /**
   * Render each cell's value/label as text.
   * @default false
   */
  showValues?: boolean
  /**
   * Override the cell's inner content — e.g. to overlay socket borders,
   * selection, or tooltips for a PDU grid. The primitive still owns the cell's
   * background colour (passed via `context.color`).
   */
  renderCell?: (cell: HeatmapCell, context: HeatmapCellContext) => ReactNode
  /**
   * Accessible label for the grid.
   * @default "Heatmap"
   */
  ariaLabel?: string
  /** Additional class for the root element */
  className?: string
}

export type HeatmapLegendProps = {
  /** Value (or pre-formatted label) at the low end of the scale. */
  min: number | string
  /** Value (or pre-formatted label) at the high end of the scale. */
  max: number | string
  /** Unit suffix appended to `min`/`max`. */
  unit?: string
  /** Heading above the gradient bar (e.g. "Temperature"). */
  label?: string
  /**
   * Gradient stops low→high.
   * @default HEATMAP_GRADIENT
   */
  colors?: readonly string[]
  /** Additional class for the root element */
  className?: string
}
