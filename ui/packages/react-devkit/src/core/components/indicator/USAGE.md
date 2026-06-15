# Indicator

A colored pill/badge used to display statuses, counts, or labels. Supports color variants, sizes, vertical stacking, and an optional click handler.

## Props

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `color` | `'red' \| 'gray' \| 'blue' \| 'yellow' \| 'green' \| 'purple' \| 'amber' \| 'slate'` | no | `'gray'` | Background color variant |
| `size` | `ComponentSize` (`'sm' \| 'md' \| 'lg'`) | no | `'md'` | Controls padding and font size |
| `vertical` | `boolean` | no | `false` | Stacks child elements vertically and adds extra spacing |
| `children` | `React.ReactNode` | no | — | Content inside the indicator (text, icons, or multiple elements) |
| `onClick` | `VoidFunction` | no | — | Makes the indicator clickable and adds hover styles |
| `className` | `string` | no | — | Additional class for the root element |

All other `div` HTML attributes are also forwarded.

A convenience constant `INDICATOR_COLORS` is exported with typed keys for each valid color string.

## Example

```tsx
import { Indicator, INDICATOR_COLORS } from "@tetherto/mdk-core-ui"

// Status badge
<Indicator color="green" size="lg">Running</Indicator>

// With icon and count
<Indicator color={INDICATOR_COLORS.AMBER}>
  <span>Pending</span>
  <span>12</span>
</Indicator>

// Clickable with vertical layout
<Indicator color="blue" vertical onClick={() => navigate("/alerts")}>
  <span>Alerts</span>
  <span>5</span>
</Indicator>
```
