# DeviceExplorer

Top-level device explorer: filter toolbar + searchable, sortable table of
miners, containers, or cabinets. Designed to be controlled by URL state in the host app.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `data` | Required | `Device[]` | - | Rows |
| `deviceType` | Required | `"container" \| "miner" \| "cabinet"` | - | Active device-type tab |
| `filterOptions` | Required | `DeviceExplorerFilterOption[]` | - | Filter category definitions |
| `getFormattedDate` | Required | `(date: Date) => string` | - | Date formatter from the host's timezone setup |
| `onDeviceTypeChange` | Required | `(type: DeviceExplorerDeviceType) => void` | - | Setter for the device type |
| `onFiltersChange` | Required | `(value: LocalFilters) => void` | - | Setter for filters |
| `onSearchTagsChange` | Required | `(tags: string[]) => void` | - | Setter for search tags |
| `renderAction` | Required | `(device: Device) => React.ReactNode` | - | Renderer for the per-row action cell |
| `searchOptions` | Required | `DeviceExplorerSearchOption[]` | - | Searchable column definitions |
| `searchTags` | Required | `string[]` | - | Active search-tag chips |
| `className` | Optional | `string` | - | Additional class names |
| `filters` | Optional | `LocalFilters` | - | Controlled filter values |
| `onRowClick` | Optional | `((device: Device) => void)` | - | Called when a row is clicked (e.g. to open the device's detail page) |
| `onSelectedDevicesChange` | Optional | `((selections: RowSelectionState) => void)` | - | Setter for row selection |
| `onSortingChange` | Optional | `((sorting: SortingState) => void)` | - | - |
| `selectedDevices` | Optional | `RowSelectionState` | - | Controlled row-selection state |
<!-- END GENERATED: props -->

## Minimal example

```tsx
<DeviceExplorer
  deviceType={deviceType}
  onDeviceTypeChange={setDeviceType}
  data={devices}
  filterOptions={filterOptions}
  searchOptions={searchOptions}
  searchTags={searchTags}
  onSearchTagsChange={setSearchTags}
  onFiltersChange={setFilters}
  getFormattedDate={(date) => formatInTimezone(date, tz)}
  renderAction={(device) => <RowActionMenu device={device} />}
/>
```

## Data contracts

- `DeviceExplorerDeviceType = "container" | "miner" | "cabinet"`
- `Device` — [`foundation/types/device`](../../types/device.ts)
- `LocalFilters`, `DataTableRowSelectionState` — re-exported from `core`.

## Notes

- The component handles the device-type/sorting interaction internally:
  switching to `cabinet` selects a default sort by `id` desc, switching to
  any other type clears sort
- Wrap the page in `<MdkProvider>`; the toolbar calls `useDeviceResolution`
  and the table consumes `useTimezoneFormatter`
