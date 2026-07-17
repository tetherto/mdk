/**
 * Framework-agnostic chart payload contracts shared between the data layer
 * (`@tetherto/mdk-react-adapter` hooks) and the presentation layer
 * (`@tetherto/mdk-react-devkit` chart cards).
 *
 * Keeping these here avoids leaking telemetry shaping into pages — adapter
 * hooks build `ChartCardData` and pass it straight to `<LineChartCard />`,
 * which renders without further transformation.
 *
 * @category dashboard
 */

/**
 * A single (x, y) sample. `x` is a Unix timestamp in **seconds**
 * (lightweight-charts convention); `y` is `null` to render gaps.
 *
 * @category dashboard
 */
export type ChartDataPoint = {
  x: number
  y: number | null
}

/**
 * A named line series with colour and points. Optional `visible` lets pages
 * pre-hide datasets without removing them from the data array.
 *
 * @category dashboard
 */
export type ChartDataset = {
  label?: string
  borderColor: string
  data: ChartDataPoint[]
  visible?: boolean
}

/**
 * Minimum chart-ready payload — assignable to
 * `LineChartCardData` from `@tetherto/mdk-react-devkit`.
 *
 * Adapter hooks return values of this shape so dashboard pages stay free
 * of unit conversion, formatting, and dataset-construction code.
 *
 * @category dashboard
 */
export type ChartCardData = {
  datasets: ChartDataset[]
} & Partial<{
  /** Y-axis tick formatter (e.g. `(v) => \`${v.toFixed(2)} MW\``). */
  yTicksFormatter: (value: number) => string
  /** Crosshair / price-scale formatter — same signature as `yTicksFormatter`. */
  priceFormatter: (value: number) => string
  /** Highlighted current value rendered next to the chart title. */
  highlightedValue: { value: string | number; unit?: string }
}>
