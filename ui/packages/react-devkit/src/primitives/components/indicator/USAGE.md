# Indicator

A colored pill/badge used to display statuses, counts, or labels. Supports color variants, sizes, vertical stacking, and an optional click handler.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `children` | Optional | `React.ReactNode` | - | Children content (can include text, icons, multiple elements) |
| `className` | Optional | `string` | - | Custom className for the root element |
| `color` | Optional | `"red" \| "gray" \| "blue" \| "yellow" \| "green" \| "purple" \| "amber" \| "slate"` | `"gray"` | Color variant of the indicator |
| `onClick` | Optional | `(VoidFunction & React.MouseEventHandler<HTMLDivElement>)` | - | Click handler |
| `size` | Optional | `"sm" \| "md" \| "lg"` | `"md"` | Size variant of the indicator |
| `vertical` | Optional | `boolean` | `false` | When true, adds extra spacing between child elements and stacks them vertically. Useful for displaying multiple pieces of information (e.g. status + count) in a clear way |
<!-- END GENERATED: props -->

## Example

```tsx
import { Indicator, INDICATOR_COLORS } from "@tetherto/mdk-react-devkit"

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
