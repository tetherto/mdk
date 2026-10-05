# Cascader

A two-panel hierarchical selection component. The left panel lists categories; the right panel shows their children. Supports single and multiple selection modes and a flat search view.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `options` | Required | `CascaderOption[]` | - | Hierarchical options to display in the cascader Parent options with children appear in the left panel Child options appear in the right panel when parent is selected |
| `className` | Optional | `string` | - | Custom className for the root cascader element |
| `disabled` | Optional | `boolean` | `false` | Disable the entire cascader (input and all options) |
| `dropdownClassName` | Optional | `string` | - | Custom className for the dropdown panels container |
| `multiple` | Optional | `boolean` | `false` | Enable multiple selection mode - true: Shows checkboxes, allows multiple selections, displays selected items as tags - false: Shows radio buttons, allows single selection |
| `onChange` | Optional | `((value: CascaderValue \| CascaderValue[] \| null) => void)` | - | Callback when selection changes - For single select: receives CascaderValue or null - For multiple select: receives CascaderValue[] or null |
| `placeholder` | Optional | `string` | `"Select..."` | Placeholder text shown in the input when no selections are made |
| `value` | Optional | `CascaderValue \| CascaderValue[]` | - | Current selected value(s) - For single select: CascaderValue (e.g., ['category', 'option']) - For multiple select: CascaderValue[] (e.g., [['cat1', 'opt1'], ['cat2', 'opt2']]) |
<!-- END GENERATED: props -->

## Props detail

> **Props are generated from this component's TypeScript types, the source of truth.** The following are supplementary (object-prop shapes, allowed values, or passthrough props), not the full prop list.

### `CascaderOption`

| Field      | Status   | Type                          | Default | Description          |
| ---------- | -------- | ----------------------------- | ------- | -------------------- |
| `value`    | Required | `string \| number \| boolean` | —       | Unique option value  |
| `label`    | Required | `string`                      | —       | Display label        |
| `children` | Optional | `CascaderOption[]`            | —       | Child options (creates a nested category) |
| `disabled` | Optional | `boolean`                     | —       | Disables this option |

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

- Typing in the input switches from the two-panel view to a flat search results list
- In `multiple` mode, clicking a category header checkbox selects/deselects all its non-disabled children; partial selections show an indeterminate state
