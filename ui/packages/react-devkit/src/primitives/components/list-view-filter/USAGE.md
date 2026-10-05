# `ListViewFilter`

A filter button that opens a popover containing a multi-select `Cascader`. Displays an active filter count badge on the button.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `onChange` | Required | `(selections: CascaderValue[]) => void` | - | Callback when filters change |
| `options` | Required | `CascaderOption[]` | - | Cascader options for filtering |
| `className` | Optional | `string` | - | Custom className for the filter button |
| `filterKey` | Optional | `string` | `"default"` | Optional key to force re-mounting the Cascader when filters change Useful if you want to reset the internal state of the Cascader when filters change |
| `localFilters` | Optional | `LocalFilters` | - | Current filter values as key-value pairs Example: { type: 'Antminer S19XP H', status: ['active', 'pending'] } |
<!-- END GENERATED: props -->

## Example

```tsx
import { ListViewFilter } from "@tetherto/mdk-react-devkit"
import type { CascaderValue } from "@tetherto/mdk-react-devkit"

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

- `ListViewFilter` always operates in `multiple` mode on the underlying `Cascader`
- The badge count reflects the number of currently active filter selections. It is hidden when count is 0.
