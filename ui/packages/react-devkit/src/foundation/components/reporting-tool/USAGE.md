# Reporting Tool

Hooks and components for the financial and operational reporting sections of a mining dashboard.

| Export | Description |
|---|---|
| `useFinancialDateRange` | Hook for managing financial date-range state (period, year, month). |

## useFinancialDateRange

```tsx
import { useFinancialDateRange } from "@tetherto/mdk-react-devkit";

const { dateRange, period, setYear, setMonth } = useFinancialDateRange({ defaultPeriod: "monthly" });
```
