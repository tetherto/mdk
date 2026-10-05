# Alerts

Page-level alerts feature: composes the searchable **Current Alerts** table
with an optional **Historical Alerts Log** section. Handles severity-filter
state, the sound-confirmation modal, historical date-range state, and the
shared `filterTags` slice on the devices store.

Use this when you want a drop-in `/alerts` route. For just the current-alerts
table or just the historical log, drop down to `CurrentAlerts` /
`HistoricalAlerts` directly.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `className` | Optional | `string` | - | Extra class on the page wrapper |
| `dateRange` | Optional | `HistoricalAlertsRange` | `last 14 days` | Controlled date range for the historical alerts. Defaults to last 14 days |
| `devices` | Optional | `Device[]` | - | Devices powering the "Current Alerts" table — a flat list of rows that carry `last.alerts`. Any backend that can produce that shape works; there is no response envelope to reproduce |
| `header` | Optional | `React.ReactNode` | - | Optional header (e.g. breadcrumbs) rendered above the alerts |
| `historicalAlerts` | Optional | `Alert[]` | - | Pre-fetched historical alerts log entries |
| `initialSeverity` | Optional | `string` | - | Initial severity selection (typically derived from `?severity=` URL param) |
| `isCurrentAlertsLoading` | Optional | `boolean` | `false` | Loading flag for the "Current Alerts" table |
| `isDemoMode` | Optional | `boolean` | `false` | When true, sound notifications are skipped (e.g. demo / preview) |
| `isHistoricalAlertsEnabled` | Optional | `boolean` | `false` | When true, shows the "Historical Alerts Log" section. Mirrors the `alertsHistoricalLogEnabled` feature flag in the source app |
| `isHistoricalAlertsLoading` | Optional | `boolean` | `false` | Loading flag for the historical log |
| `isSoundEnabled` | Optional | `boolean` | `false` | Whether sound notifications are enabled in user preferences |
| `onAlertClick` | Optional | `((id?: string \| undefined, uuid?: string \| undefined) => void)` | - | Callback invoked when the operator clicks an alert row. Receives the device id and alert uuid |
| `onDateRangeChange` | Optional | `((range: HistoricalAlertsRange) => void)` | - | Called when the operator picks a new historical range |
| `selectedAlertId` | Optional | `string` | - | Optional alert id used to focus on a single alert (deep-link from URL) |
| `typeFiltersForSite` | Optional | `CascaderOption[]` | - | Optional site-specific overrides for the type filter |
<!-- END GENERATED: props -->

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

- `Device` — [`foundation/types/device`](../../../types/device.ts). Same shape consumed by `CurrentAlerts`.
- `Alert` — [`foundation/types/alerts`](../../../types/alerts.ts). Same shape consumed by `HistoricalAlerts`.
- `HistoricalAlertsRange` — `{ start: number; end: number }` (ms epoch).

## Notes

- Filter tags are written to the shared devices store via `useDevices().setFilterTags` —
  clicking a row appends the device id, mirroring the source app behavior
- When `isHistoricalAlertsEnabled` is `false`, only the current-alerts table renders
- For URL-driven deep links, pass `initialSeverity` (one render only) for the
  severity dropdown and `selectedAlertId` to highlight a row
