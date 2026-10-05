# `HistoricalAlerts`

Sortable data table of historical alerts within a controlled date range, with
an embedded `DateRangePicker`.

> Sibling component: [`CurrentAlerts`](../current-alerts/USAGE.md). Both
> render the same `DataTable` columns from [`alerts-table-columns.tsx`](../alerts-table-columns.tsx).

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `dateRange` | Required | `HistoricalAlertsRange` | - | Selected date range for the historical query (controlled) |
| `filterTags` | Required | `string[]` | - | Shared with `CurrentAlerts` |
| `localFilters` | Required | `AlertLocalFilters` | - | Filters and search tags coming from the parent (typically shared with `CurrentAlerts`) |
| `onDateRangeChange` | Required | `(range: HistoricalAlertsRange) => void` | - | Setter for the date range |
| `alerts` | Optional | `Alert[]` | `[]` | Pre-fetched historical alerts log entries (each with a `thing` device payload) |
| `className` | Optional | `string` | - | Additional class names |
| `isLoading` | Optional | `boolean` | `false` | Show DataTable loading overlay |
| `onAlertClick` | Optional | `((id?: string \| undefined, uuid?: string \| undefined) => void)` | - | Called when the user opens an alert |
<!-- END GENERATED: props -->

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

- `Alert` — `@tetherto/mdk-react-devkit` / [`foundation/types/alerts`](../../../types/alerts.ts)
- `AlertLocalFilters` — same package, [`foundation/components/alerts/alerts-types`](../alerts-types.ts)

## Notes

- Calls `useTimezoneFormatter` from `@tetherto/mdk-react-adapter`; wrap your
  app in `<MdkProvider>` so the timezone store is reachable
- `getRowId` returns the alert `uuid`
