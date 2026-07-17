# HashrateMinerTypeView

Miner-type drilldown tab inside `<Hashrate>`. Bar chart of the latest
hashrate per miner type (Antminer, WhatsMiner, ...), with an optional
multi-select filter and a date-range picker that drives the host query.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `log` | `HashrateGroupedLog` | no | `[]` | Hashrate log grouped by miner type (`groupBy=miner`). |
| `isLoading` | `boolean` | no | `false` | Drives the chart spinner. |
| `error` | `unknown` | no | - | Drives the chart error state. |
| `dateRange` | `HashrateDateRange` | no | - | Selected date range. |
| `onDateRangeChange` | `(range) => void` | no | - | Fires when the user picks a new range. |
| `onReset` | `VoidFunction` | no | - | Optional reset handler. |

## Minimal example

```tsx
import { HashrateMinerTypeView } from "@tetherto/mdk-react-devkit";

<HashrateMinerTypeView isLoading={false} log={[]} />
```
