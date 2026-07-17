# Cascader

A two-panel hierarchical selection component. The left panel lists categories; the right panel shows their children. Supports single and multiple selection modes and a flat search view.

## Props

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `options` | `CascaderOption[]` | yes | — | Hierarchical option tree (categories with children) |
| `value` | `CascaderValue[] \| CascaderValue` | no | — | Current selection. Single: `CascaderValue`. Multiple: `CascaderValue[]` |
| `onChange` | `(value: CascaderValue[] \| CascaderValue \| null) => void` | no | — | Fired when selection changes |
| `multiple` | `boolean` | no | `false` | Enables multi-select with checkboxes |
| `placeholder` | `string` | no | `'Select...'` | Input placeholder text |
| `disabled` | `boolean` | no | `false` | Disables the entire component |
| `className` | `string` | no | — | Additional class for the root element |
| `dropdownClassName` | `string` | no | — | Additional class for the dropdown panels container |

### `CascaderOption`

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `value` | `string \| number \| boolean` | yes | Unique option value |
| `label` | `string` | yes | Display label |
| `children` | `CascaderOption[]` | no | Child options (creates a nested category) |
| `disabled` | `boolean` | no | Disables this option |

### Types

- `CascaderValue` — `(string | number | boolean)[]` — path from parent to leaf (e.g. `['electronics', 'phones']`)

## Example

```tsx
import { Cascader } from "@tetherto/mdk-react-devkit"

const options = [
  {
    value: "status",
    label: "Status",
    children: [
      { value: "active", label: "Active" },
      { value: "offline", label: "Offline" },
    ],
  },
]

// Single select
const [value, setValue] = useState<CascaderValue>(["status", "active"])

<Cascader
  options={options}
  value={value}
  onChange={(value) => setValue(value as CascaderValue)}
/>

// Multi-select
const [values, setValues] = useState<CascaderValue[]>([])

<Cascader
  options={options}
  value={values}
  onChange={(value) => setValues(value as CascaderValue[])}
  multiple
  placeholder="Filter by status..."
/>
```

## Notes

- Typing in the input switches from the two-panel view to a flat search results list.
- In `multiple` mode, clicking a category header checkbox selects/deselects all its non-disabled children; partial selections show an indeterminate state.
