import { cn, HEATMAP_GRADIENT } from "../../utils"
import type { HeatmapLegendProps } from "./types"

const formatBound = (bound: number | string, unit?: string): string =>
  unit ? `${bound} ${unit}` : String(bound)

/**
 * HeatmapLegend — a gradient bar with low/high scale labels, matching the
 * gradient used by {@link Heatmap}.
 *
 * @example
 * ```tsx
 * <HeatmapLegend label="Temperature" min={20} max={85} unit="°C" />
 * ```
 * @category charts
 * @domain generic
 * @tier agent-ready
 */
export const HeatmapLegend = ({
  min,
  max,
  unit,
  label,
  colors = HEATMAP_GRADIENT,
  className,
}: HeatmapLegendProps) => {
  const gradient = `linear-gradient(to right, ${colors.join(", ")})`

  return (
    <div className={cn("mdk-heatmap-legend", className)}>
      {label !== undefined && <div className="mdk-heatmap-legend__label">{label}</div>}
      <div className="mdk-heatmap-legend__bar" style={{ background: gradient }} />
      <div className="mdk-heatmap-legend__scale">
        <span>{formatBound(min, unit)}</span>
        <span>{formatBound(max, unit)}</span>
      </div>
    </div>
  )
}

HeatmapLegend.displayName = "HeatmapLegend"
