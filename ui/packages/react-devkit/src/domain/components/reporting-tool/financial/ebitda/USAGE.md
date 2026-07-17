# EBITDA Components

Components for the EBITDA financial reporting section.

| Component | Description |
|---|---|
| `Ebitda` | Top-level EBITDA dashboard combining metrics row, charts, and date picker. |
| `EbitdaCharts` | Chart panel visualising revenue, cost, and EBITDA over time. |
| `EbitdaMetrics` | Summary metric cards row: actual, hodl, selling, and production cost. |

## Ebitda Props

| Prop | Type | Description |
|------|------|-------------|
| `metrics` | `EbitdaDisplayMetrics \| null` | Computed EBITDA metrics. |
| `ebitdaChartInput` | `ToBarChartDataInput \| null` | Data for the EBITDA bar chart. |
| `btcProducedChartInput` | `ToBarChartDataInput \| null` | Data for the BTC produced chart. |
| `hasBtcProducedAllZeros` | `boolean` | Whether all BTC produced values are zero. |
| `showEbitdaBarChart` | `boolean` | Show the EBITDA bar chart. |
| `currentBTCPrice` | `number` | Current Bitcoin price in USD. |
| `datePicker` | `ReactElement` | Date picker element. |
| `isLoading` | `boolean` | Loading state. |
| `errors` | `string[]` | Error messages to display. |

## Minimal example

```tsx
import { Ebitda } from "@tetherto/mdk-react-devkit";

<Ebitda
  metrics={null}
  ebitdaChartInput={null}
  btcProducedChartInput={null}
  hasBtcProducedAllZeros={false}
  showEbitdaBarChart={true}
  currentBTCPrice={65000}
  datePicker={<span>Date picker</span>}
  isLoading={false}
/>
```
