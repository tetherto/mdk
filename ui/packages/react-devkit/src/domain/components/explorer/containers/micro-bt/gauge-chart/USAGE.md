# `GaugeChartComponent`

Arc-gauge chart for displaying a single metric against its maximum range. Used in MicroBT container views for temperature and pressure readings.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `max` | Required | `number` | - | Maximum value for the gauge |
| `unit` | Required | `string` | - | Unit of measurement |
| `value` | Required | `number` | - | Current value |
| `chartStyle` | Optional | `React.CSSProperties` | `{}` | Custom chart style |
| `className` | Optional | `string` | - | Custom className |
| `colors` | Optional | `string[]` | `[COLOR.EMERALD, COLOR.SOFT_TEAL]` | Arc colors in HEX format |
| `height` | Optional | `number` | `200` | Chart height in pixels |
| `hideText` | Optional | `boolean` | `true` | Hide the percentage text inside the chart |
| `label` | Optional | `string` | `""` | Label/title for the chart |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { GaugeChartComponent } from "@tetherto/mdk-react-devkit";

<GaugeChartComponent max={100} value={72} label="Temperature" unit="°C" />
```
