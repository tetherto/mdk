# `SubsidyFee`

Financial dashboard section for subsidy and fee reporting. Shows a summary with optional fee log entries and allows date-range filtering.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `data` | Optional | `SubsidyFeesResponse \| null` | - | Subsidy fee data |
| `errorMessage` | Optional | `string` | `"Error loading block data. Please try again later."` | Error message to display |
| `isError` | Optional | `boolean` | `false` | Show error state |
| `isLoading` | Optional | `boolean` | `false` | Show loading state |
| `log` | Optional | `SubsidyFeesLogEntry[]` | - | Fee log entries |
| `onDateRangeChange` | Optional | `(dateRange: FinancialDateRange, query: FinanceQueryParams) => void` | - | Called when date range changes |
| `showSummaryCards` | Optional | `boolean` | `false` | Show summary stat cards |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { SubsidyFee } from "@tetherto/mdk-react-devkit";

<SubsidyFee isLoading={false} showSummaryCards={true} log={[]} data={null} />
```
