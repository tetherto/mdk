# EBITDA components

Components for the EBITDA financial reporting section.

| Component       | Description                                                                |
| --------------- | -------------------------------------------------------------------------- |
| `Ebitda`        | Top-level EBITDA dashboard combining metrics row, charts, and date picker  |
| `EbitdaCharts`  | Chart panel visualizing revenue, cost, and EBITDA over time                |
| `EbitdaMetrics` | Summary metric cards row: actual, hodl, selling, and production cost       |

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

### `Ebitda` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `btcProducedChartInput` | Required | `ToBarChartDataInput \| null` | - | Data for the BTC produced chart |
| `currentBTCPrice` | Required | `number` | - | Current Bitcoin price in USD |
| `datePicker` | Required | `React.ReactElement<unknown, string \| React.JSXElementConstructor<any>>` | - | Date picker element |
| `ebitdaChartInput` | Required | `ToBarChartDataInput \| null` | - | Data for the EBITDA bar chart |
| `hasBtcProducedAllZeros` | Required | `boolean` | - | Whether all BTC produced values are zero |
| `hasDateSelection` | Required | `boolean` | - | When false, show the "select a period" hint instead of empty data |
| `metrics` | Required | `EbitdaDisplayMetrics \| null` | - | Computed EBITDA metrics |
| `showEbitdaBarChart` | Required | `boolean` | - | Show the EBITDA bar chart |
| `errors` | Optional | `string[]` | `[]` | Error messages to display |
| `isLoading` | Optional | `boolean` | `false` | Loading state |
| `setCostHref` | Optional | `string` | - | Optional URL for the "Set Monthly Cost" control (hidden when omitted) |

### `EbitdaCharts` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `btcDisplayData` | Required | `BarChartDataResult` | - | - |
| `ebitdaChartData` | Required | `BarChartDataResult` | - | - |
| `hasBtcProducedAllZeros` | Required | `boolean` | - | - |
| `isLoading` | Required | `boolean` | - | - |
| `showEbitdaBarChart` | Required | `boolean` | - | - |

### `EbitdaMetrics` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `currentBTCPrice` | Required | `number` | - | - |
| `metrics` | Required | `EbitdaDisplayMetrics` | - | - |
<!-- END GENERATED: props -->

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
  hasDateSelection={true}
  isLoading={false}
/>
```
