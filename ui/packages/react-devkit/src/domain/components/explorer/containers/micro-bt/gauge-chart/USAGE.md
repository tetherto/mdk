# GaugeChartComponent

Arc-gauge chart for displaying a single metric against its maximum range. Used in MicroBT container views for temperature and pressure readings.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `max` | `number` | yes | — | Maximum gauge value. |
| `value` | `number` | yes | — | Current reading. |
| `label` | `string` | no | — | Chart title. |
| `unit` | `string` | yes | — | Unit of measurement (e.g. `"°C"`, `"bar"`). |
| `chartStyle` | `React.CSSProperties` | no | — | Custom inline styles for the chart wrapper. |
| `arcColors` | `string[]` | no | — | HEX color stops for the arc gradient. |

## Minimal example

```tsx
import { GaugeChartComponent } from "@tetherto/mdk-react-devkit";

<GaugeChartComponent max={100} value={72} label="Temperature" unit="°C" />
```
