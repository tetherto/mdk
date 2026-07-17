/**
 * Runnable example for Heatmap + HeatmapLegend.
 */
import { Heatmap, HeatmapLegend } from "@tetherto/mdk-react-devkit"

const rows = [
  [{ value: 20 }, { value: 35 }, { value: 50 }, { value: 42 }],
  [{ value: 60 }, { value: 72 }, { value: null }, { value: 55 }],
  [{ value: 44 }, { value: 81 }, { value: 66 }, { value: 30 }],
]

export const HeatmapExample = () => (
  <div className="mdk-example-row">
    <Heatmap data={rows} showValues />
    <HeatmapLegend label="Temperature" min={20} max={81} unit="°C" />
  </div>
)
