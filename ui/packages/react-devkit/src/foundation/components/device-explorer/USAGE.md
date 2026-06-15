# DeviceExplorer

Top-level device explorer: filter toolbar + searchable, sortable table of
miners or cabinets. Designed to be controlled by URL state in the host app.

## Props

| Prop                       | Type                                            | Required | Default | Description                                  |
| -------------------------- | ----------------------------------------------- | -------- | ------- | -------------------------------------------- |
| `deviceType`               | `DeviceExplorerDeviceType`                      | yes      | —       | Active device-type tab.                      |
| `onDeviceTypeChange`       | `(deviceType: DeviceExplorerDeviceType) => void` | yes     | —       | Setter for the device type.                  |
| `data`                     | `Device[]`                                      | yes      | —       | Rows.                                        |
| `filters`                  | `LocalFilters`                                  | no       | —       | Controlled filter values.                    |
| `onFiltersChange`          | `(filters: LocalFilters) => void`               | yes      | —       | Setter for filters.                          |
| `filterOptions`            | `DeviceExplorerToolbarProps["filterOptions"]`   | yes      | —       | Filter category definitions.                 |
| `searchOptions`            | `DeviceExplorerToolbarProps["searchOptions"]`   | yes      | —       | Searchable column definitions.               |
| `searchTags`               | `string[]`                                      | yes      | —       | Active search-tag chips.                     |
| `onSearchTagsChange`       | `(tags: string[]) => void`                      | yes      | —       | Setter for search tags.                      |
| `selectedDevices`          | `DataTableRowSelectionState`                    | no       | —       | Controlled row-selection state.              |
| `onSelectedDevicesChange`  | `(selections: DataTableRowSelectionState) => void` | no    | —       | Setter for row selection.                    |
| `renderAction`             | `(row) => React.ReactNode`                      | no       | —       | Renderer for the per-row action cell.        |
| `getFormattedDate`         | `(ts: number \| string) => string`              | yes      | —       | Date formatter from the host's timezone setup. |
| `className`                | `string`                                        | no       | —       | Additional class names.                      |

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
  getFormattedDate={(ts) => formatInTimezone(ts, tz)}
/>
```

## Data contracts

- `DeviceExplorerDeviceType = "miner" | "cabinet"`
- `Device` — `foundation/types/device`
- `LocalFilters`, `DataTableRowSelectionState` — re-exported from `core`.

## Notes

- The component handles the device-type/sorting interaction internally:
  switching to `cabinet` selects a default sort by `id` desc, switching to
  `miner` clears sort.
- Wrap the page in `<MdkProvider>`; the toolbar calls `useDeviceResolution`
  and the table consumes `useTimezoneFormatter`.
