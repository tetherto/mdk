# ListViewFilter

A filter button that opens a popover containing a multi-select `Cascader`. Displays an active filter count badge on the button.

## Props

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `options` | `CascaderOption[]` | yes | — | Hierarchical filter options (same shape as `Cascader`) |
| `onChange` | `(selections: CascaderValue[]) => void` | yes | — | Fired with all selected filter paths when selection changes |
| `localFilters` | `LocalFilters` | no | — | Current filter values as a key/value map (controls the Cascader) |
| `filterKey` | `string` | no | `'default'` | Key used to force re-mount the Cascader when filters are reset |
| `className` | `string` | no | — | Additional class for the root element |

### `LocalFilters`

```ts
Record<string, string | number | boolean | (string | number | boolean)[]>
```

Example: `{ type: "Antminer S19XP", status: ["active", "pending"] }`

## Example

```tsx
import { ListViewFilter } from "@tetherto/mdk-core-ui"
import type { CascaderValue } from "@tetherto/mdk-core-ui"

const filterOptions = [
  {
    value: "type",
    label: "Type",
    children: [
      { value: "Antminer S19XP", label: "Antminer S19XP" },
      { value: "Avalon A1346", label: "Avalon A1346" },
    ],
  },
  {
    value: "status",
    label: "Status",
    children: [
      { value: "active", label: "Active" },
      { value: "offline", label: "Offline" },
    ],
  },
]

const [filters, setFilters] = useState<LocalFilters>({})

const handleChange = (selections: CascaderValue[]) => {
  // Convert to LocalFilters format for your state
}

<ListViewFilter
  options={filterOptions}
  localFilters={filters}
  onChange={handleChange}
/>
```

## Notes

- `ListViewFilter` always operates in `multiple` mode on the underlying `Cascader`.
- The badge count reflects the number of currently active filter selections. It is hidden when count is 0.
