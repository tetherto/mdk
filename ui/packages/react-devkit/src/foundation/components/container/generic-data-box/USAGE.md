# GenericDataBox

Reusable labelled stat box for container summary panels. Renders a vertical list of label-value-unit rows with optional highlight and colour/flash states driven by threshold rules.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `data` | `DataItem[]` | no | `[]` | Array of stat rows to display. |
| `fallbackValue` | `unknown` | no | — | Value rendered when a row's `value` is `undefined`. |

`DataItem` fields: `label`, `value`, `units?`, `unit?`, `isHighlighted?`, `color?`, `flash?`.

## Minimal example

```tsx
import { GenericDataBox } from "@tetherto/mdk-react-devkit";

<GenericDataBox
  data={[
    { label: "Temperature", value: 45, units: "°C" },
    { label: "Pressure", value: 2.5, units: "bar", isHighlighted: true },
  ]}
/>
```
