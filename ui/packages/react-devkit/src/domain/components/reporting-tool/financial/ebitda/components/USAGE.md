# EBITDA Metric Cards

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

## Minimal example

```tsx
import { ActualEbitdaCard, BitcoinPriceCard } from "@tetherto/mdk-react-devkit";

<ActualEbitdaCard value={125000} />
<BitcoinPriceCard value={65000} />
```
