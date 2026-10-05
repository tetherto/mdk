# `AlertsTable` family — `CurrentAlerts` and `HistoricalAlerts`

The MDK doesn't ship a single "AlertsTable" component. The agent-first design
document uses the name as a category — there are two concrete components:

- `CurrentAlerts` — sortable, searchable data table of currently active alerts
  derived from a raw `Device[]` payload. Plays an audible beep when a
  critical alert is present (gated by user confirmation).
- `HistoricalAlerts` — sortable data table of historical alerts within a
  controlled date range, with an embedded `DateRangePicker`

Both render a `DataTable` with shared columns from [`alerts-table-columns.tsx`](./alerts-table-columns.tsx).

## Minimal example

```tsx
<HistoricalAlerts
  alerts={alerts}
  localFilters={localFilters}
  filterTags={filterTags}
  dateRange={range}
  onDateRangeChange={setRange}
/>
```

## Data contracts

- `Alert` — `@tetherto/mdk-react-devkit` / [`foundation/types/alerts`](../../types/alerts.ts)
- `AlertLocalFilters` — same package, [`domain/alerts/alerts-types`](./alerts-types.ts)
- `Device` — [`foundation/types/device`](../../types/device.ts)

## Notes

- Both components call `useTimezoneFormatter` from
  `@tetherto/mdk-react-adapter`; wrap your app in `<MdkProvider>` so the
  timezone store is reachable
- The columns are shared, so `getRowId` returns the alert's `uuid` in both
