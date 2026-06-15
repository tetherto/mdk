import { cn } from '../../utils'
import { GaugeSvg } from './gauge-svg'
import {
  GAUGE_DEFAULT_ARC_WIDTH,
  GAUGE_DEFAULT_COLORS,
  GAUGE_DEFAULT_HEIGHT,
  GAUGE_DEFAULT_MAX_WIDTH,
  GAUGE_DEFAULT_NR_OF_LEVELS,
} from './constants'
import { forwardRef } from 'react'

export type GaugeChartProps = {
  /** Value between 0 and 1 (e.g. 0.75 = 75%). Values outside the range are clamped. */
  percent: number
  /** Arc colours in HEX format. */
  colors?: string[]
  /** Arc thickness as a fraction of the gauge radius (0–1). */
  arcWidth?: number
  /** Number of arc segments. */
  nrOfLevels?: number
  /** Hide the percentage text rendered inside the gauge. */
  hideText?: boolean
  /** Stable id used for the gauge's accessibility labels. */
  id?: string
  /** Chart height in pixels or any CSS length (e.g. `'200px'` or `'50%'`). */
  height?: number | string
  /** Maximum width in pixels. */
  maxWidth?: number
  className?: string
}

/**
 * GaugeChart - Presentational gauge / speedometer chart.
 *
 * Implementation note: this component used to wrap the `react-gauge-chart`
 * NPM package, but that package is published only as CommonJS with a broken
 * `module` field that points at the same CJS file. That made it crash under
 * ESM bundlers that don't add a `__esModule ? .default : module` interop
 * shim (Webpack 4, raw esbuild, certain SSR setups, etc.) with React's
 * "Element type is invalid" error. We replaced it with a pure-SVG internal
 * implementation (see `./gauge-svg.tsx`) so the component is bundler- and
 * runtime-agnostic and has zero third-party runtime dependencies.
 *
 * @example
 * ```tsx
 * <GaugeChart percent={0.75} colors={['#00FF00', '#FF0000']} />
 * ```
 * @category charts
 * @domain generic
 * @tier agent-ready
 */
export const GaugeChart = forwardRef<HTMLDivElement, GaugeChartProps>(
  (
    {
      percent,
      className,
      hideText = false,
      id = 'mdk-gauge-chart',
      colors = GAUGE_DEFAULT_COLORS,
      height = GAUGE_DEFAULT_HEIGHT,
      maxWidth = GAUGE_DEFAULT_MAX_WIDTH,
      arcWidth = GAUGE_DEFAULT_ARC_WIDTH,
      nrOfLevels = GAUGE_DEFAULT_NR_OF_LEVELS,
    },
    ref,
  ) => {
    return (
      <div ref={ref} className={cn('mdk-gauge-chart', className)} style={{ height, maxWidth }}>
        <GaugeSvg
          id={id}
          percent={percent}
          colors={colors}
          arcWidth={arcWidth}
          hideText={hideText}
          nrOfLevels={nrOfLevels}
        />
      </div>
    )
  },
)
GaugeChart.displayName = 'GaugeChart'
