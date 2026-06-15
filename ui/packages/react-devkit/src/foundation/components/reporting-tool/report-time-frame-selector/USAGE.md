# ReportTimeFrameSelector

Reporting-period picker with preset windows (7d / 30d / month-to-date / custom range). Used in financial reporting sections to control the visible date range.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `presetTimeFrame` | `string` | yes | — | Currently selected preset value. |
| `dateRange` | `DateRange` | yes | — | Custom date range state. |
| `setPresetTimeFrame` | `(value) => void` | yes | — | Update the preset selection. |
| `setDateRange` | `(range) => void` | yes | — | Update the custom date range. |

## Minimal example

```tsx
import { ReportTimeFrameSelector } from "@tetherto/mdk-react-devkit";

<ReportTimeFrameSelector
  presetTimeFrame="30d"
  dateRange={{ from: new Date(), to: new Date() }}
  setPresetTimeFrame={(value) => setState(value)}
  setDateRange={(r) => setRange(r)}
/>
```
