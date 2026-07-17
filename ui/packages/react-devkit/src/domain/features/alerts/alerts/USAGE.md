# Alerts

Page-level alerts feature: composes the searchable **Current Alerts** table
with an optional **Historical Alerts Log** section. Handles severity-filter
state, the sound-confirmation modal, historical date-range state, and the
shared `filterTags` slice on the devices store.

Use this when you want a drop-in `/alerts` route. For just the current-alerts
table or just the historical log, drop down to `CurrentAlerts` /
`HistoricalAlerts` directly.

## Props

| Prop                        | Type                                       | Required | Default        | Description                                                              |
| --------------------------- | ------------------------------------------ | -------- | -------------- | ------------------------------------------------------------------------ |
| `devices`                   | `Device[][]`                               | no       | —              | Raw devices payload — the current-alerts table derives rows from `device.last.alerts`. |
| `isCurrentAlertsLoading`    | `boolean`                                  | no       | `false`        | Loading flag for the current-alerts table.                               |
| `historicalAlerts`          | `Alert[]`                                  | no       | —              | Pre-fetched historical log entries.                                      |
| `isHistoricalAlertsLoading` | `boolean`                                  | no       | `false`        | Loading flag for the historical log.                                     |
| `isHistoricalAlertsEnabled` | `boolean`                                  | no       | `false`        | Show the historical section. Gate behind a feature flag if needed.       |
| `selectedAlertId`           | `string`                                   | no       | —              | Focus a single alert (deep-link from `?alertId=`).                       |
| `initialSeverity`           | `string`                                   | no       | —              | Initial severity filter (e.g. from `?severity=`).                        |
| `onAlertClick`              | `(id?: string, uuid?: string) => void`     | no       | —              | Row-click handler. Receives the device id and alert uuid.                |
| `dateRange`                 | `HistoricalAlertsRange`                    | no       | last 14 days   | Controlled date range for the historical log.                            |
| `onDateRangeChange`         | `(range: HistoricalAlertsRange) => void`   | no       | —              | Called when the operator picks a new historical range.                   |
| `isSoundEnabled`            | `boolean`                                  | no       | `false`        | Whether sound alerts are on in user prefs. Drives the confirmation modal. |
| `isDemoMode`                | `boolean`                                  | no       | `false`        | Skip sound playback (demo / preview screens).                            |
| `typeFiltersForSite`        | `CascaderOption[]`                         | no       | —              | Site-specific overrides for the type filter dropdown.                    |
| `header`                    | `ReactNode`                                | no       | —              | Optional header (breadcrumbs etc.) rendered above the table.             |
| `className`                 | `string`                                   | no       | —              | Extra class on the page wrapper.                                         |

## Minimal example

```tsx
<Alerts
  devices={devices}
  isCurrentAlertsLoading={isLoading}
  isHistoricalAlertsEnabled
  historicalAlerts={history}
  onAlertClick={(id, uuid) => router.push(`/alerts/${uuid}?device=${id}`)}
/>
```

## Requirements

- Render inside `<MdkProvider>`. The component reads `filterTags` from the
  devices store and the historical log uses `useTimezoneFormatter`.

## Data contracts

- `Device` — `foundation/types/device`. Same shape consumed by `CurrentAlerts`.
- `Alert` — `foundation/types/alerts`. Same shape consumed by `HistoricalAlerts`.
- `HistoricalAlertsRange` — `{ start: number; end: number }` (ms epoch).

## Notes

- Filter tags are written to the shared devices store via `useDevices().setFilterTags` —
  clicking a row appends the device id, mirroring the source app behaviour.
- When `isHistoricalAlertsEnabled` is `false`, only the current-alerts table renders.
- For URL-driven deep links, pass `initialSeverity` (one render only) for the
  severity dropdown and `selectedAlertId` to highlight a row.
