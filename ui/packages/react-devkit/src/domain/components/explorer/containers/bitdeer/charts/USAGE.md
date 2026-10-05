# BitdeerTankPressureCharts / BitdeerTankTempCharts

Time-series chart panels for Bitdeer immersion containers. `BitdeerTankPressureCharts` plots Tank1/Tank2 dielectric pressure (bar). `BitdeerTankTempCharts` plots oil and water hot/cold temperatures for a selected tank.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

### `BitdeerTankPressureCharts` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `chartDataPayload` | Optional | `ChartDataPayload` | - | Declarative chart configuration |
| `chartTitle` | Optional | `string` | - | Title shown in the chart header |
| `data` | Optional | `UnknownRecord[]` | `[]` | Raw container telemetry entries (with `ts` + nested stats group) |
| `dateRange` | Optional | `{ start?: number \| undefined; end?: number \| undefined; }` | - | Custom date range as Unix epoch seconds. Currently unused — accepted by the shared props type but not read by the chart components |
| `fixedTimezone` | Optional | `string` | - | IANA timezone for x-axis ticks |
| `footer` | Optional | `React.ReactNode` | - | Footer (e.g. min/max/avg stats) |
| `height` | Optional | `number` | - | Chart pixel height |
| `rangeOptions` | Optional | `{ label: string; value: string; }[]` | `5m/30m/3h/1D` | Override the default range selector options |
| `showLegend` | Optional | `boolean` | `true` | Show the toggleable legend |
| `showRangeSelector` | Optional | `boolean` | `true` | Show the range selector buttons |
| `tag` | Optional | `string` | - | Container tag (any leading prefix is stripped) |
| `timeline` | Optional | `string` | `"24h"` | Initial / controlled timeline value |

### `BitdeerTankTempCharts` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `chartDataPayload` | Optional | `ChartDataPayload` | - | Declarative chart configuration |
| `chartTitle` | Optional | `string` | - | Title shown in the chart header |
| `data` | Optional | `UnknownRecord[]` | `[]` | Raw container telemetry entries (with `ts` + nested stats group) |
| `dateRange` | Optional | `{ start?: number \| undefined; end?: number \| undefined; }` | - | Custom date range as Unix epoch seconds. Currently unused — accepted by the shared props type but not read by the chart components |
| `fixedTimezone` | Optional | `string` | - | IANA timezone for x-axis ticks |
| `footer` | Optional | `React.ReactNode` | - | Footer (e.g. min/max/avg stats) |
| `height` | Optional | `number` | - | Chart pixel height |
| `rangeOptions` | Optional | `{ label: string; value: string; }[]` | `5m/30m/3h/1D` | Override the default range selector options |
| `showLegend` | Optional | `boolean` | `true` | Show the toggleable legend |
| `showRangeSelector` | Optional | `boolean` | `true` | Show the range selector buttons |
| `tag` | Optional | `string` | - | Container tag (any leading prefix is stripped) |
| `tankNumber` | Optional | `string \| number` | `1` | Tank number (1 or 2) |
| `timeline` | Optional | `string` | `"24h"` | Initial / controlled timeline value |
<!-- END GENERATED: props -->

## Props detail

Both components extend `ContainerChartsBuilderProps`.


> **Props are generated from this component's TypeScript types, the source of truth.** The following are supplementary (object-prop shapes, allowed values, or passthrough props), not the full prop list.

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `tag` | Optional | `string` | — | Container identifier used as the API telemetry key |
| `data` | Optional | `Array<UnknownRecord>` | — | Raw telemetry payload from the container API |
| `timeline` | Optional | `string` | — | Active time-range selection (e.g. `"24h"`, `"7d"`) |
| `dateRange` | Optional | `{ start?: number; end?: number }` | — | Custom date range as Unix epoch seconds |
| `fixedTimezone` | Optional | `string` | — | IANA timezone string for timestamp display |
| `height` | Optional | `number` | — | Chart height in pixels |
| `chartTitle` | Optional | `string` | `'Tank Pressure'` | Panel heading override (pressure chart only) |
| `tankNumber` | Optional | `number \| string` | `1` | Tank index to display (temp chart only) |

## Minimal example

```tsx
import { BitdeerTankPressureCharts, BitdeerTankTempCharts } from "@tetherto/mdk-react-devkit";

<BitdeerTankPressureCharts tag="container-01" data={telemetry} timeline="24h" />
<BitdeerTankTempCharts tag="container-01" tankNumber={1} data={telemetry} timeline="24h" />
```
