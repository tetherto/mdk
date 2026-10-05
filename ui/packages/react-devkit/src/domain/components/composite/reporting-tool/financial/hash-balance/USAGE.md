# Hash balance (financial reporting)

Composite financial view for site hash revenue, network hashrate, hashprice, and hash cost. Use `HashBalance` for the full page (tabs + timeframe controls), or compose `HashBalanceRevenuePanel` / `HashBalanceCostPanel` with your own chrome.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

### `HashBalance` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `className` | Optional | `string` | - | Root layout class |
| `data` | Optional | `HashRevenueResponse \| null` | `null` | Revenue / cost log and summary |
| `errorMessage` | Optional | `string` | `"Error loading hash balance data. Please try again later."` | Error copy when `isError` |
| `initialDateRange` | Optional | `FinancialDateRange` | `year-to-date` | Initial period |
| `isError` | Optional | `boolean` | `false` | Show error state |
| `isLoading` | Optional | `boolean` | `false` | Show loading state |
| `onDateRangeChange` | Optional | `(dateRange: FinancialDateRange, query: FinanceQueryParams) => void` | - | Fired when the user changes the period |
| `tabsClassName` | Optional | `string` | - | Tabs wrapper class |
| `tabsListClassName` | Optional | `string` | - | Tab list class |

### `HashBalanceCostPanel` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `dateRange` | Required | `FinancialDateRange` | - | Active reporting window |
| `data` | Optional | `HashRevenueResponse \| null` | `null` | Revenue / cost log and summary payload |
| `isLoading` | Optional | `boolean` | `false` | Loading state |
| `log` | Optional | `HashRevenueLogEntry[]` | - | Optional log override |
| `timeframeType` | Optional | `null \| "month" \| "week" \| "year"` | `null` | Year / month / week mode |

### `HashBalanceRevenuePanel` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `currency` | Required | `"BTC" \| "USD"` | - | `USD` or `BTC` label for per-PH/day units |
| `dateRange` | Required | `FinancialDateRange` | - | Active reporting window |
| `onCurrencyChange` | Required | `(currency: HashBalanceCurrency) => void` | - | Currency toggle handler |
| `data` | Optional | `HashRevenueResponse \| null` | `null` | Revenue / cost log and summary payload |
| `isLoading` | Optional | `boolean` | `false` | Loading state |
| `log` | Optional | `HashRevenueLogEntry[]` | - | Optional log override |
| `timeframeType` | Optional | `null \| "month" \| "week" \| "year"` | `null` | Year / month / week mode |
<!-- END GENERATED: props -->

## `HashBalance`

```tsx
import { HashBalance } from "@tetherto/mdk-react-devkit";

<HashBalance data={response} isLoading={false} />
```
