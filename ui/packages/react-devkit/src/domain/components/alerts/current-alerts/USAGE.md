# CurrentAlerts

Sortable, searchable data table of currently active alerts derived from a raw
`Device[][]` payload. Plays an audible beep when a critical alert is present
(gated by user confirmation).

> Sibling component: [`HistoricalAlerts`](../historical-alerts/USAGE.md).
> Both render the same `DataTable` columns from `alerts-table-columns.tsx`.

## Props

| Prop                   | Type                                       | Required | Default | Description                                                     |
| ---------------------- | ------------------------------------------ | -------- | ------- | --------------------------------------------------------------- |
| `devices`              | `Device[][]`                               | no       | —       | Raw devices payload (alerts derived from `device.last.alerts`). |
| `isLoading`            | `boolean`                                  | no       | `false` | Show DataTable loading overlay.                                 |
| `localFilters`         | `AlertLocalFilters`                        | yes      | —       | Filters controlled outside (e.g. URL severity).                 |
| `onLocalFiltersChange` | `(filters: AlertLocalFilters) => void`     | yes      | —       | Setter for the filters above.                                   |
| `filterTags`           | `string[]`                                 | yes      | —       | Search tag chips (controlled).                                  |
| `onFilterTagsChange`   | `(tags: string[]) => void`                 | yes      | —       | Setter for the tags above.                                      |
| `selectedAlertId`      | `string`                                   | no       | —       | Optional deep-link id.                                          |
| `onAlertClick`         | `(id?: string, uuid?: string) => void`     | no       | —       | Called when the user opens an alert.                            |
| `isSoundEnabled`       | `boolean`                                  | no       | `false` | Enable critical alert beep.                                     |
| `isDemoMode`           | `boolean`                                  | no       | `false` | Skip sound entirely (demos / previews).                         |
| `typeFiltersForSite`   | `TagFilterBarProps["typeFiltersForSite"]`  | no       | —       | Site-specific overrides for the type filter.                    |
| `className`            | `string`                                   | no       | —       | Additional class names.                                         |

## Minimal example

```tsx
<CurrentAlerts
  devices={devices}
  localFilters={localFilters}
  onLocalFiltersChange={setLocalFilters}
  filterTags={tags}
  onFilterTagsChange={setTags}
  onAlertClick={(id) => openDetail(id)}
/>
```

## Data contracts

- `Alert` — `@tetherto/mdk-react-devkit` / `foundation/types/alerts`
- `AlertLocalFilters` — same package, `foundation/components/alerts/alerts-types`
- `Device` — `foundation/types/device`

## Notes

- Calls `useTimezoneFormatter` from `@tetherto/mdk-react-adapter`; wrap your
  app in `<MdkProvider>` so the timezone store is reachable.
- `getRowId` returns the alert `uuid`.
