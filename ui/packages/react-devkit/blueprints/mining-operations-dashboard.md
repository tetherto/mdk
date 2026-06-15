---
id: mining-operations-dashboard
title: Mining Operations Dashboard
intent: >
  Live operator view of a mining site: real-time hashrate, active incidents,
  pool performance, and per-device telemetry. The well-trodden path when
  someone says "build me a mining dashboard" or "I want to see the state of
  my miners".
domain: mining-operations
orkCapabilities:
  - hashrate-monitoring
  - incident-alerts
  - pool-performance
  - device-telemetry
components:
  - PoolManagerDashboard
  - LineChartCard
  - ActiveIncidentsCard
  - PoolDetailsCard
  - DeviceExplorer
hooks:
  - useNotification
demoRoute: /pool-manager/dashboard
---

## When to use

Pick this blueprint when the user wants a single operator-facing dashboard
covering one site or a small fleet, with telemetry refreshing in (near) real
time. It is the highest-leverage starting point because it bundles every
core mining-ops capability into one page.

If only a subset of ORK capabilities is available at the target site, drop
the components corresponding to absent capabilities and keep the rest — the
layout is composable.

## Page composition

```tsx
import {
  ActiveIncidentsCard,
  DeviceExplorer,
  LineChartCard,
  PoolDetailsCard,
  PoolManagerDashboard,
} from "@tetherto/mdk-react-devkit";
import {
  useGetAvailableDevices,
  useHashrateChartData,
  useNotification,
} from "@tetherto/mdk-react-adapter";

export default function MiningOperationsPage() {
  const { devices } = useGetAvailableDevices();
  const { notify } = useNotification();
  const hashrate = useHashrateChartData({ timeline: "5m" });

  return (
    <PoolManagerDashboard>
      <section className="grid-row">
        <LineChartCard title="Hash rate" data={hashrate.data} isLoading={hashrate.isLoading} />
        <ActiveIncidentsCard onItemClick={(id) => notify({ id })} />
      </section>
      <section className="grid-row">
        <PoolDetailsCard />
        <DeviceExplorer devices={devices} />
      </section>
    </PoolManagerDashboard>
  );
}
```

## State / data flow

- Wrap the app in `<MdkProvider>` (from `@tetherto/mdk-react-adapter`) once,
  at the root — telemetry, notifications, and device stores all read from it.
- `useGetAvailableDevices` is the canonical source for the device list used
  by `DeviceExplorer`. `useHashrateChartData` returns a `ChartCardData`
  payload that `<LineChartCard>` consumes verbatim — don't refetch from
  the component.
- `ActiveIncidentsCard` reads from the notifications store; route clicks
  through your router so the dashboard never owns navigation state.
- For historical drill-down, swap `ActiveIncidentsCard` for
  `HistoricalAlerts` inside a dialog.

## Common variations

- **No pool data**: drop `PoolDetailsCard` and keep the hashrate + incidents
  side of the layout.
- **Reporting export**: add `StatsExport` to the page header (see the
  `reporting` blueprint for the full recipe).
- **Multi-site**: lift devices into a parent context and pass them down;
  duplicate the inner sections per site, share the chrome.
