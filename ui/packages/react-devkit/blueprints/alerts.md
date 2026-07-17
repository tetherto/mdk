---
id: alerts
title: Alerts
intent: >
  Operator-facing alerts page: shows currently active alerts at the top, full
  historical alerts below, with tag-based filtering and severity drill-in. The
  well-trodden path when someone says "show me the alerts page" or "I want a
  view of active and historical incidents".
domain: mining-operations
kernelCapabilities:
  - incident-alerts
  - device-telemetry
components:
  - Alerts
hooks: []
demoRoute: /alerts
---

## When to use

Pick this blueprint when the user wants the canonical alerts view from a
mining operator UI — the live "Current Alerts" table on top, the filterable,
paginated "Historical Alerts Log" below, both driven off the real backend.

The blueprint recreates the look and behaviour of the legacy operator alerts
page using only MDK components and hooks — no copying of host-app code
required. The single `<Alerts>` feature composes both sections and owns the
shared filter / date-range state internally.

## Page composition

```tsx
import { useState } from "react";
import { useCurrentAlertDevices, useHistoricalAlerts } from "@tetherto/mdk-react-adapter";
import { Alerts } from "@tetherto/mdk-react-devkit";
import type { Alert, Device } from "@tetherto/mdk-react-devkit";

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

export default function AlertsPage() {
  const [range, setRange] = useState(() => {
    const end = Date.now();
    return { start: end - FOURTEEN_DAYS_MS, end };
  });

  // Live current alerts (20s poll) + chunked historical-alerts fetch.
  const devices = useCurrentAlertDevices();
  const historical = useHistoricalAlerts(range);

  return (
    <Alerts
      devices={devices.data as Device[][] | undefined}
      isCurrentAlertsLoading={devices.isLoading}
      historicalAlerts={historical.data as Alert[] | undefined}
      isHistoricalAlertsLoading={historical.isLoading}
      isHistoricalAlertsEnabled
      onDateRangeChange={setRange}
    />
  );
}
```

## State / data flow

- `useCurrentAlertDevices()` polls `list-things` (every 20s) and returns the raw
  `Device[][]` the current-alerts table reads `last.alerts` from. No mock data —
  it hits the real backend through `<MdkProvider>`.
- `useHistoricalAlerts({ start, end })` fetches the historical log in sequential
  24-hour windows, merges them by `uuid`, and shapes the rows for the table.
- The `<Alerts>` feature owns the shared filter tags / local filters / date range
  internally — the page only supplies data and the `onDateRangeChange` callback.
- Wrap the app in `<MdkProvider>` once at the root — the starter and shell
  templates already do this.

## Routing

- The page registers itself at `/alerts` when scaffolded with
  `mdk-ui add feature alerts`. Override with `--route /something-else`.
- The `mdk-ui-shell` template ships this page **by default** (alongside the
  Dashboard) — `mdk-ui create mdk-ui-shell` includes it out of the box.

## Going further

- Pass `selectedAlertId` (from a `/alerts/:uuid` route param) and an
  `onAlertClick` that updates the URL to deep-link a single alert.
- Pass `initialSeverity` (read from a `?severity=` URL param) to pre-filter the
  table — the shell's header bell deep-links here per severity via
  `AlarmsBellButton`'s `onSeverityClick`.
