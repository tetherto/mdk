# `GaugeChart`

A gauge / speedometer chart drawn as pure inline SVG (no third-party runtime
dependency). Accepts a `percent` value between 0 and 1 and displays it as a
coloured arc.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `percent` | Required | `number` | - | Value between 0 and 1 (e.g. 0.75 = 75%). Values outside the range are clamped |
| `arcsLength` | Optional | `number[]` | - | Custom arc-segment proportions (auto-normalised), overriding `nrOfLevels`. e.g. `[0.7, 0.3]` for a progress-style gauge whose first arc is the fill |
| `arcWidth` | Optional | `number` | `0.2` | Arc thickness as a fraction of the gauge radius (0–1) |
| `className` | Optional | `string` | - | Additional class for the root `div` |
| `colors` | Optional | `string[]` | `[COLOR.GREEN, COLOR.RED]` | Arc colours in HEX format |
| `formatTextValue` | Optional | `((percent: number) => string)` | - | Format the center label from the clamped fraction (0–1) |
| `height` | Optional | `string \| number` | `200` | Chart height in pixels or any CSS length (e.g. `'200px'` or `'50%'`) |
| `hideNeedle` | Optional | `boolean` | `false` | Hide the needle + hub (e.g. for a progress-style gauge) |
| `hideText` | Optional | `boolean` | `false` | Hide the percentage text rendered inside the gauge |
| `id` | Optional | `string` | `"mdk-gauge-chart"` | Stable id used for the gauge's accessibility labels |
| `maxWidth` | Optional | `number` | - | Maximum width in pixels |
| `needleColor` | Optional | `string` | `COLOR.STEEL_GRAY` | Needle + hub colour |
| `nrOfLevels` | Optional | `number` | `3` | Number of arc segments. Ignored when `arcsLength` is provided |
<!-- END GENERATED: props -->

## Example

```tsx
import { GaugeChart } from "@tetherto/mdk-react-devkit"

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

- `percent` is automatically clamped to `[0, 1]`
- When rendering multiple gauges on the same page, provide a unique `id` for each instance so their SVG accessibility labels stay distinct
- For a progress-style gauge (single fill arc, no needle) pass `arcsLength={[percent, 1 - percent]}` with two `colors` and `hideNeedle`
