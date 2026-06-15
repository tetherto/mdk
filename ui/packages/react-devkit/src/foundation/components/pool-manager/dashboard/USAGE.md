# PoolManagerDashboard

Landing page for the Pool Manager: site-level stats, primary navigation
blocks, and a compact recent-alerts list.

## Props

| Prop                | Type                            | Required | Default | Description                                            |
| ------------------- | ------------------------------- | -------- | ------- | ------------------------------------------------------ |
| `stats`             | `DashboardStats`                | no       | —       | Top-of-page stat blocks; hidden while loading.         |
| `isStatsLoading`    | `boolean`                       | no       | `false` | Hide stats while loading.                              |
| `alerts`            | `Alert[]`                       | no       | `[]`    | Recent alerts list (capped to `MAX_ALERTS_DISPLAYED`). |
| `onNavigationClick` | `(url: string) => void`         | yes      | —       | Called when a navigation block is clicked.             |
| `onViewAllAlerts`   | `VoidFunction`                  | yes      | —       | Called when "View All Alerts" is clicked.              |

## Minimal example

```tsx
<PoolManagerDashboard
  stats={stats}
  alerts={alerts}
  onNavigationClick={(url) => router.push(url)}
  onViewAllAlerts={() => router.push("/alerts")}
/>
```

## Data contracts

- `DashboardStats` — declared in `dashboard-types.ts` alongside the component.
- `Alert` — `foundation/types/device` (same shape as `ActiveIncidentsCard` consumes).

## Notes

- Navigation blocks are static (`navigationBlocks` constant) — extend the
  constant to add or rename sections.
- For a more compact recent-alerts list elsewhere on the page, prefer
  `ActiveIncidentsCard`.
