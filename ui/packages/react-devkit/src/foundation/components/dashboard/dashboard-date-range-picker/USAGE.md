# DashboardDateRangePicker

Dashboard wrapper around the core `DateRangePicker`. It speaks
`{ start, end }` epoch-millisecond timestamps so it drops straight into
`useDashboardDateRange` from `@tetherto/mdk-react-adapter` without any
intermediate `Date <-> number` plumbing in the page.

## Props

| Prop         | Type                                              | Required | Default        | Description                                                       |
| ------------ | ------------------------------------------------- | -------- | -------------- | ----------------------------------------------------------------- |
| `value`      | `{ start: number; end: number }`                  | yes      | —              | Current range as epoch-millisecond timestamps.                    |
| `onChange`   | `(next: { start: number; end: number }) => void`  | yes      | —              | Fires when the user applies a range.                              |
| `dateFormat` | `string`                                          | no       | `'dd/MM/yyyy'` | `date-fns` format string used for the trigger label.              |
| `disabled`   | `boolean`                                         | no       | `false`        | Disable the trigger.                                              |
| `className`  | `string`                                          | no       | —              | Optional class hook applied to the trigger button.                |

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
  core picker.
- The popover, presets, and styling all come from the core
  `DateRangePicker`. This wrapper exists only to adapt the value shape.
