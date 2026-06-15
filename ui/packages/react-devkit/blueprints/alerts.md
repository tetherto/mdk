---
id: alerts
title: Alerts
intent: >
  Operator-facing alerts page: shows currently active alerts at the top, full
  historical alerts below, with tag-based filtering and severity drill-in. The
  well-trodden path when someone says "show me the alerts page" or "I want a
  view of active and historical incidents".
domain: mining-operations
orkCapabilities:
  - incident-alerts
  - device-telemetry
components:
  - CurrentAlerts
  - HistoricalAlerts
hooks: []
demoRoute: /alerts
---

## When to use

Pick this blueprint when the user wants the canonical alerts view from a
mining operator UI — split into "Current" (live, dismissable) and
"Historical" (filterable, paginated) sections, both driven off the same
device list.

The blueprint recreates the look and behaviour of the legacy operator
alerts page using only MDK components and hooks — no copying of host-app
code required.

## Page composition

```tsx
import { useState } from "react";
import type { Alert } from "@tetherto/mdk-react-devkit";
import { CurrentAlerts, HistoricalAlerts } from "@tetherto/mdk-react-devkit";

const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;

const MOCK_ALERTS: Alert[] = [
  {
    id: "1",
    uuid: "alrt-1",
    severity: "critical",
    name: "miner_offline",
    description: "Miner 0xA1 has stopped reporting.",
    code: "001",
    createdAt: NOW - 2 * DAY,
    thing: { id: "miner-A1" },
  },
  {
    id: "2",
    uuid: "alrt-2",
    severity: "warning",
    name: "temp_high",
    description: "Container 03 exceeded 78°C.",
    code: "002",
    createdAt: NOW - 5 * DAY,
    thing: { id: "container-03" },
  },
];

export default function AlertsPage() {
  const [localFilters, setLocalFilters] = useState<Record<string, string>>({});
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({ start: NOW - 7 * DAY, end: NOW });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <CurrentAlerts
        devices={[] as never}
        isLoading={false}
        localFilters={localFilters}
        onLocalFiltersChange={setLocalFilters}
        filterTags={filterTags}
        onFilterTagsChange={setFilterTags}
        isDemoMode
      />
      <HistoricalAlerts
        alerts={MOCK_ALERTS}
        isLoading={false}
        localFilters={localFilters}
        filterTags={filterTags}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />
    </div>
  );
}
```

## State / data flow

- `CurrentAlerts` derives rows from a `devices` prop (`device.last.alerts`).
  Pass the real `Device[][]` from your API layer when available; use `isDemoMode`
  for development or demo environments.
- `HistoricalAlerts` takes a flat `alerts: Alert[]` array fetched from the API.
  Swap the `MOCK_ALERTS` constant for a real `useQuery` call when you wire up the
  API layer.
- Filters (`localFilters`, `filterTags`) and `dateRange` live in local state and
  are shared between both sections for a consistent operator view.
- Wrap the app in `<MdkProvider>` once at the root — the starter template already
  does this.

## Routing

- The page registers itself at `/alerts` when scaffolded with
  `mdk-ui add feature alerts`. Override with `--route /something-else`.

## Going further

- Add severity-aware drill-in by reading `?severity=` from the URL and
  feeding it into `localFilters` on mount.
- Wire row clicks to the device explorer route via the router's
  `useNavigate` so an operator can jump from an alert to the offending miner.
