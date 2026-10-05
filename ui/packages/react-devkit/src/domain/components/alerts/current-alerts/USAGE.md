# `CurrentAlerts`

Sortable, searchable data table of currently active alerts derived from a raw
`Device[]` payload. Plays an audible beep when a critical alert is present
(gated by user confirmation).

> Sibling component: [`HistoricalAlerts`](../historical-alerts/USAGE.md).
> Both render the same `DataTable` columns from [`alerts-table-columns.tsx`](../alerts-table-columns.tsx).

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `filterTags` | Required | `string[]` | - | Search tags (controlled). Mirrors the redux `selectFilterTags` slice in the source app |
| `localFilters` | Required | `AlertLocalFilters` | - | Filters controlled outside (typically by URL severity param) |
| `onFilterTagsChange` | Required | `(tags: string[]) => void` | - | Setter for the tags above |
| `onLocalFiltersChange` | Required | `(filters: AlertLocalFilters) => void` | - | Setter for the filters above |
| `className` | Optional | `string` | - | Additional class names |
| `devices` | Optional | `Device[]` | - | Devices carrying alerts (`last.alerts`), as a flat list. Unwrapping any backend envelope is the data layer's job, not this component's. Shape mirrors the API response from the source app |
| `isDemoMode` | Optional | `boolean` | `false` | Skip sound entirely (e.g. in demo/preview environments) |
| `isLoading` | Optional | `boolean` | `false` | Show DataTable loading overlay |
| `isSoundEnabled` | Optional | `boolean` | `false` | Whether sound notifications are enabled in user preferences (e.g. theme slice) |
| `onAlertClick` | Optional | `((id?: string \| undefined, uuid?: string \| undefined) => void)` | - | Click handler when the user opens an alert (right arrow icon in the row) |
| `selectedAlertId` | Optional | `string` | - | Optional id used to focus on a single alert (deep-link from URL) |
| `typeFiltersForSite` | Optional | `CascaderOption[]` | - | Optional site-specific overrides for the type filter |
<!-- END GENERATED: props -->

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

- `Alert` — `@tetherto/mdk-react-devkit` / [`foundation/types/alerts`](../../../types/alerts.ts)
- `AlertLocalFilters` — same package, [`foundation/components/alerts/alerts-types`](../alerts-types.ts)
- `Device` — [`foundation/types/device`](../../../types/device.ts)

## Notes

- Calls `useTimezoneFormatter` from `@tetherto/mdk-react-adapter`; wrap your
  app in `<MdkProvider>` so the timezone store is reachable
- `getRowId` returns the alert `uuid`
