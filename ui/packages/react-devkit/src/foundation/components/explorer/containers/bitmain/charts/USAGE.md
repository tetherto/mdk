# Bitmain Container Charts

Five time-series chart panels for BitMain hydro and immersion containers:

| Component | Description |
|---|---|
| `BitMainHydroLiquidTemperatureCharts` | Dielectric liquid temperature for a hydro-cooled container. |
| `BitMainLiquidPressureCharts` | Dielectric liquid pressure across an immersion container. |
| `BitMainLiquidTempCharts` | Dielectric liquid temperature across an immersion container. |
| `BitMainPowerCharts` | Per-phase power, voltage, and current draw. |
| `BitMainSupplyLiquidFlowCharts` | Supply-side coolant flow rates. |

All extend `ContainerChartsBuilderProps`.

## Props (all components)

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `tag` | `string` | yes | — | Container identifier used as the API telemetry key. |
| `data` | `unknown` | yes | — | Raw telemetry payload from the container API. |
| `timeline` | `string` | no | — | Active time-range selection (e.g. `"24h"`). |
| `dateRange` | `DateRange` | no | — | Custom date range. |
| `fixedTimezone` | `string` | no | — | IANA timezone string. |
| `height` | `number` | no | — | Chart height in pixels. |
| `chartTitle` | `string` | no | — | Panel heading override. |
| `pairIndices` | `readonly number[]` | no | — | Series indices for paired-layout containers. |

## Minimal example

```tsx
import { BitMainPowerCharts } from "@tetherto/mdk-react-devkit";

<BitMainPowerCharts tag="container-01" data={telemetry} timeline="24h" />
```
