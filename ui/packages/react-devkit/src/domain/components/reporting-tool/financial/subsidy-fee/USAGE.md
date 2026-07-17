# SubsidyFee

Financial dashboard section for subsidy and fee reporting. Shows a summary with optional fee log entries and allows date-range filtering.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `isError` | `boolean` | no | — | Show error state. |
| `isLoading` | `boolean` | no | — | Show loading state. |
| `errorMessage` | `string` | no | — | Error message to display. |
| `showSummaryCards` | `boolean` | no | — | Show summary stat cards. |
| `log` | `SubsidyFeesLogEntry[]` | no | — | Fee log entries. |
| `data` | `SubsidyFeesResponse \| null` | no | — | Subsidy fee data. |
| `onDateRangeChange` | `(dateRange, query) => void` | no | — | Called when date range changes. |

## Minimal example

```tsx
import { SubsidyFee } from "@tetherto/mdk-react-devkit";

<SubsidyFee isLoading={false} showSummaryCards={true} log={[]} data={null} />
```
