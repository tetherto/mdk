# `DashboardDateRangePicker`

Dashboard wrapper around the core `DateRangePicker`. It speaks
`{ start, end }` epoch-millisecond timestamps so it drops straight into
`useDashboardDateRange` from `@tetherto/mdk-react-adapter` without any
intermediate `Date <-> number` plumbing in the page.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `onChange` | Required | `(next: DashboardDateRange) => void` | - | Fires with the next `{ start, end }` window when the user applies a range |
| `value` | Required | `DashboardDateRange` | - | Current range as `{ start, end }` epoch-millisecond timestamps |
| `className` | Optional | `string` | - | Optional class hook |
| `dateFormat` | Optional | `string` | `"dd/MM/yyyy"` | Display format. Defaults to `dd/MM/yyyy` |
| `disabled` | Optional | `boolean` | `false` | Disable the trigger |
<!-- END GENERATED: props -->

## Example

```tsx
import { useDashboardDateRange } from "@tetherto/mdk-react-adapter"
import { DashboardDateRangePicker } from "@tetherto/mdk-react-devkit"

const { start, end, setRange } = useDashboardDateRange()

<DashboardDateRangePicker
  value={{ start, end }}
  onChange={({ start, end }) => setRange(start, end)}
/>
```

## Notes

- The wrapper ignores partial selections — `onChange` only fires once the
  user has picked both `from` and `to` and clicked **Apply Range** in the
  core picker
- The popover, presets, and styling all come from the core
  `DateRangePicker`. This wrapper exists only to adapt the value shape
