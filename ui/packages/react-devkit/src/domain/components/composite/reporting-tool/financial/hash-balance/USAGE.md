# Hash balance (financial reporting)

Composite financial view for site hash revenue, network hashrate, hashprice, and hash cost. Use `HashBalance` for the full page (tabs + timeframe controls), or compose `HashBalanceRevenuePanel` / `HashBalanceCostPanel` with your own chrome.

## HashBalance

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `data` | `HashRevenueResponse \| null` | no | — | Revenue / cost log and summary. |
| `isLoading` | `boolean` | no | — | Show loading state. |
| `isError` | `boolean` | no | — | Show error state. |
| `errorMessage` | `string` | no | — | Error copy when `isError`. |
| `initialDateRange` | `FinancialDateRange` | no | year-to-date | Initial period. |
| `onDateRangeChange` | `(range, query) => void` | no | — | Fired when the user changes the period. |
| `className` | `string` | no | — | Root layout class. |
| `tabsClassName` | `string` | no | — | Tabs wrapper class. |
| `tabsListClassName` | `string` | no | — | Tab list class. |

```tsx
import { HashBalance } from "@tetherto/mdk-react-devkit";

<HashBalance data={response} isLoading={false} />
```

## HashBalanceRevenuePanel

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `data` | `HashRevenueResponse \| null` | no | — | Same payload as `HashBalance`. |
| `log` | `HashRevenueLogEntry[]` | no | — | Optional log override. |
| `dateRange` | `FinancialDateRange` | yes | — | Active reporting window. |
| `currency` | `HashBalanceCurrency` | yes | — | `USD` or `BTC` label for per-PH/day units. |
| `onCurrencyChange` | `(currency) => void` | yes | — | Currency toggle handler. |
| `isLoading` | `boolean` | no | — | Loading state. |
| `timeframeType` | `TimeframeTypeValue \| null` | no | — | Year / month / week mode. |

## HashBalanceCostPanel

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `data` | `HashRevenueResponse \| null` | no | — | Same payload as `HashBalance`. |
| `log` | `HashRevenueLogEntry[]` | no | — | Optional log override. |
| `dateRange` | `FinancialDateRange` | yes | — | Active reporting window. |
| `isLoading` | `boolean` | no | — | Loading state. |
| `timeframeType` | `TimeframeTypeValue \| null` | no | — | Year / month / week mode. |
