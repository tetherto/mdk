# Bitmain container charts

Five time-series chart panels for Bitmain hydro and immersion containers:

| Component | Description |
|---|---|
| `BitMainHydroLiquidTemperatureCharts` | Dielectric liquid temperature for a hydro-cooled container |
| `BitMainLiquidPressureCharts` | Dielectric liquid pressure across an immersion container |
| `BitMainLiquidTempCharts` | Dielectric liquid temperature across an immersion container |
| `BitMainPowerCharts` | Per-phase power, voltage, and current draw |
| `BitMainSupplyLiquidFlowCharts` | Supply-side coolant flow rates |

All extend `ContainerChartsBuilderProps`.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

### `BitMainHydroLiquidTemperatureCharts` props

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

### `BitMainLiquidPressureCharts` props

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

### `BitMainLiquidTempCharts` props

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

### `BitMainPowerCharts` props

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

### `BitMainSupplyLiquidFlowCharts` props

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
<!-- END GENERATED: props -->

## Props detail

These props apply to all components on this page.


> **Props are generated from this component's TypeScript types, the source of truth.** The following are supplementary (object-prop shapes, allowed values, or passthrough props), not the full prop list.

| Prop | Status | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `tag` | Optional | `string` | — | Container identifier used as the API telemetry key |
| `data` | Optional | `Array<UnknownRecord>` | — | Raw telemetry payload from the container API |
| `timeline` | Optional | `string` | `'24h'` | Active time-range selection (e.g. `"24h"`) |
| `dateRange` | Optional | `{ start?: number; end?: number }` | — | Custom date range as Unix epoch seconds |
| `fixedTimezone` | Optional | `string` | — | IANA timezone string |
| `height` | Optional | `number` | — | Chart height in pixels |
| `chartTitle` | Optional | `string` | Per component | Panel heading override |
| `showLegend` | Optional | `boolean` | `true` | Show the toggleable series legend. Defaults to `false` for `BitMainSupplyLiquidFlowCharts`. |
| `showRangeSelector` | Optional | `boolean` | `true` | Show the range selector controls |
| `footer` | Optional | `React.ReactNode` | — | Optional footer content rendered below the chart |

Each component defaults `chartTitle` to its own heading: `'Hydro Liquid Temperature'` (`BitMainHydroLiquidTemperatureCharts`), `'Liquid Pressure'` (`BitMainLiquidPressureCharts`), `'Liquid Temperature'` (`BitMainLiquidTempCharts`), `'Power Consumption'` (`BitMainPowerCharts`), `'Supply Liquid Flow'` (`BitMainSupplyLiquidFlowCharts`).

## Minimal example

```tsx
import { BitMainPowerCharts } from "@tetherto/mdk-react-devkit";

<BitMainPowerCharts tag="container-01" data={telemetry} timeline="24h" />
```
