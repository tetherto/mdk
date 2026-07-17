# AlertsTable family — `CurrentAlerts` and `HistoricalAlerts`

The MDK doesn't ship a single "AlertsTable" component. The agent-first design
document uses the name as a category — there are two concrete components:

- `CurrentAlerts` — sortable, searchable data table of currently active alerts
  derived from a raw `Device[][]` payload. Plays an audible beep when a
  critical alert is present (gated by user confirmation).
- `HistoricalAlerts` — sortable data table of historical alerts within a
  controlled date range, with an embedded `DateRangePicker`.

Both render a `DataTable` with shared columns from `alerts-table-columns.tsx`.

## `CurrentAlerts` props

| Prop                  | Type                                     | Required | Default | Description                                                        |
| --------------------- | ---------------------------------------- | -------- | ------- | ------------------------------------------------------------------ |
| `devices`             | `Device[][]`                             | no       | —       | Raw devices payload (alerts derived from `device.last.alerts`).    |
| `isLoading`           | `boolean`                                | no       | `false` | Show DataTable loading overlay.                                    |
| `localFilters`        | `AlertLocalFilters`                      | yes      | —       | Filters controlled outside (e.g. URL severity).                    |
| `onLocalFiltersChange`| `(filters: AlertLocalFilters) => void`   | yes      | —       | Setter for the filters above.                                      |
| `filterTags`          | `string[]`                               | yes      | —       | Search tag chips (controlled).                                     |
| `onFilterTagsChange`  | `(tags: string[]) => void`               | yes      | —       | Setter for the tags above.                                         |
| `selectedAlertId`     | `string`                                 | no       | —       | Optional deep-link id.                                             |
| `onAlertClick`        | `(id?: string, uuid?: string) => void`   | no       | —       | Called when the user opens an alert.                               |
| `isSoundEnabled`      | `boolean`                                | no       | `false` | Enable critical alert beep.                                        |
| `isDemoMode`          | `boolean`                                | no       | `false` | Skip sound entirely (demos / previews).                            |
| `typeFiltersForSite`  | `TagFilterBarProps["typeFiltersForSite"]` | no      | —       | Site-specific overrides for the type filter.                       |
| `className`           | `string`                                 | no       | —       | Additional class names.                                            |

## `HistoricalAlerts` props

| Prop                | Type                                         | Required | Default | Description                                  |
| ------------------- | -------------------------------------------- | -------- | ------- | -------------------------------------------- |
| `alerts`            | `Alert[]`                                    | no       | `[]`    | Pre-fetched historical alert entries.        |
| `isLoading`         | `boolean`                                    | no       | `false` | Show DataTable loading overlay.              |
| `localFilters`      | `AlertLocalFilters`                          | yes      | —       | Shared with `CurrentAlerts`.                 |
| `filterTags`        | `string[]`                                   | yes      | —       | Shared with `CurrentAlerts`.                 |
| `dateRange`         | `{ start: number; end: number }`             | yes      | —       | Controlled date range.                       |
| `onDateRangeChange` | `(range: { start: number; end: number }) => void` | yes | —       | Setter for the date range.                   |
| `onAlertClick`      | `(id?: string, uuid?: string) => void`       | no       | —       | Called when the user opens an alert.         |
| `className`         | `string`                                     | no       | —       | Additional class names.                      |

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
- `AlertLocalFilters` — same package, `domain/alerts/alerts-types`
- `Device` — `foundation/types/device`

## Notes

- Both components call `useTimezoneFormatter` from
  `@tetherto/mdk-react-adapter`; wrap your app in `<MdkProvider>` so the
  timezone store is reachable.
- The columns are shared, so `getRowId` returns the alert's `uuid` in both.
