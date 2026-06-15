# GaugeChart

A gauge / speedometer chart rendered via `react-gauge-chart`. Accepts a `percent` value between 0 and 1 and displays it as a colored arc.

## Props

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `percent` | `number` | yes | — | Fill level between `0` (empty) and `1` (full) |
| `colors` | `string[]` | no | `[COLOR.GREEN, COLOR.RED]` | Arc segment colors in HEX format, from low to high |
| `arcWidth` | `number` | no | `0.2` | Thickness of the arc relative to the chart radius (0–1) |
| `nrOfLevels` | `number` | no | `3` | Number of arc color segments |
| `hideText` | `boolean` | no | `false` | Hides the percentage text in the center |
| `id` | `string` | no | `'mdk-gauge-chart'` | Unique DOM id required by `react-gauge-chart` |
| `height` | `number \| string` | no | `200` | Container height in pixels or a CSS value |
| `className` | `string` | no | — | Additional class for the root `div` |

## Example

```tsx
import { GaugeChart } from "@tetherto/mdk-core-ui"

<GaugeChart percent={0.75} />

<GaugeChart
  percent={0.4}
  colors={["#34C759", "#FF9500", "#FF3B30"]}
  nrOfLevels={3}
  hideText
  height={150}
/>
```

## Notes

- `percent` is automatically clamped to `[0, 1]`.
- When rendering multiple gauges on the same page, provide a unique `id` for each instance to prevent `react-gauge-chart` rendering conflicts.
