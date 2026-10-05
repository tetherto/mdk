# EBITDA metric cards

Individual stat cards and charts used inside the EBITDA section.

| Component | Description |
|---|---|
| `ActualEbitdaCard` | Computed actual EBITDA for the selected period. |
| `EbitdaHodlCard` | EBITDA projection assuming all BTC is held (hodl). |
| `EbitdaSellingCard` | EBITDA projection assuming all BTC is sold at current price. |
| `BitcoinProducedCard` | Total Bitcoin mined in the selected period. |
| `BitcoinPriceCard` | Current or average Bitcoin price for the period. |
| `BitcoinProductionCostCard` | Per-BTC production cost for the period. |
| `BitcoinProducedChart` | Bar chart of Bitcoin produced over time. |
| `MonthlyEbitdaChart` | Monthly EBITDA bar chart. |

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

### `ActualEbitdaCard` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `value` | Required | `number` | - | - |

### `BitcoinPriceCard` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `value` | Required | `number` | - | - |

### `BitcoinProducedCard` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `value` | Required | `number` | - | - |

### `BitcoinProducedChart` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `chartData` | Required | `BarChartDataResult` | - | - |
| `hasAllZeros` | Optional | `boolean` | - | - |
| `height` | Optional | `number` | - | - |
| `isLoading` | Optional | `boolean` | - | - |

### `BitcoinProductionCostCard` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `value` | Required | `number` | - | - |

### `EbitdaHodlCard` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `currentBTCPrice` | Required | `number` | - | - |
| `value` | Required | `number` | - | - |

### `EbitdaSellingCard` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `value` | Required | `number` | - | - |

### `MonthlyEbitdaChart` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `chartData` | Required | `BarChartDataResult` | - | - |
| `height` | Optional | `number` | - | - |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { ActualEbitdaCard, BitcoinPriceCard } from "@tetherto/mdk-react-devkit";

<ActualEbitdaCard value={125000} />
<BitcoinPriceCard value={65000} />
```
