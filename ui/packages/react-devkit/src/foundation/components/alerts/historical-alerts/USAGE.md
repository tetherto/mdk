# HistoricalAlerts

Sortable data table of historical alerts within a controlled date range, with
an embedded `DateRangePicker`.

> Sibling component: [`CurrentAlerts`](../current-alerts/USAGE.md). Both
> render the same `DataTable` columns from `alerts-table-columns.tsx`.

## Props

| Prop                | Type                                              | Required | Default | Description                          |
| ------------------- | ------------------------------------------------- | -------- | ------- | ------------------------------------ |
| `alerts`            | `Alert[]`                                         | no       | `[]`    | Pre-fetched historical alert entries.|
| `isLoading`         | `boolean`                                         | no       | `false` | Show DataTable loading overlay.      |
| `localFilters`      | `AlertLocalFilters`                               | yes      | —       | Shared with `CurrentAlerts`.         |
| `filterTags`        | `string[]`                                        | yes      | —       | Shared with `CurrentAlerts`.         |
| `dateRange`         | `{ start: number; end: number }`                  | yes      | —       | Controlled date range.               |
| `onDateRangeChange` | `(range: { start: number; end: number }) => void` | yes      | —       | Setter for the date range.           |
| `onAlertClick`      | `(id?: string, uuid?: string) => void`            | no       | —       | Called when the user opens an alert. |
| `className`         | `string`                                          | no       | —       | Additional class names.              |

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

- `Alert` — `@tetherto/mdk-react-devkit` / `foundation/types/alerts`
- `AlertLocalFilters` — same package, `foundation/components/alerts/alerts-types`

## Notes

- Calls `useTimezoneFormatter` from `@tetherto/mdk-react-adapter`; wrap your
  app in `<MdkProvider>` so the timezone store is reachable.
- `getRowId` returns the alert `uuid`.
