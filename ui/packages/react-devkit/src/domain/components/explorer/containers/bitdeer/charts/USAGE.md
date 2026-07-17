# BitdeerTankPressureCharts / BitdeerTankTempCharts

Time-series chart panels for Bitdeer immersion containers. `BitdeerTankPressureCharts` plots Tank1/Tank2 dielectric pressure (bar). `BitdeerTankTempCharts` plots oil and water hot/cold temperatures for a selected tank.

## Props (both components extend `ContainerChartsBuilderProps`)

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `tag` | `string` | yes | — | Container identifier used as the API telemetry key. |
| `data` | `unknown` | yes | — | Raw telemetry payload from the container API. |
| `timeline` | `string` | no | — | Active time-range selection (e.g. `"24h"`, `"7d"`). |
| `dateRange` | `DateRange` | no | — | Custom date range when timeline is `"custom"`. |
| `fixedTimezone` | `string` | no | — | IANA timezone string for timestamp display. |
| `height` | `number` | no | — | Chart height in pixels. |
| `chartTitle` | `string` | no | — | Panel heading override (pressure chart only). |
| `tankNumber` | `number \| string` | no | `1` | Tank index to display (temp chart only). |

## Minimal example

```tsx
import { BitdeerTankPressureCharts, BitdeerTankTempCharts } from "@tetherto/mdk-react-devkit";

<BitdeerTankPressureCharts tag="container-01" data={telemetry} timeline="24h" />
<BitdeerTankTempCharts tag="container-01" tankNumber={1} data={telemetry} timeline="24h" />
```
