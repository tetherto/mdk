# Divider

A styled horizontal or vertical separator line, optionally containing a label. Wraps Radix UI `@radix-ui/react-separator`.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `align` | Optional | `"center" \| "left" \| "right"` | `"center"` | Horizontal alignment of the label |
| `children` | Optional | `React.ReactNode` | - | Text or node rendered in the middle of the divider |
| `className` | Optional | `string` | - | Custom className |
| `dashed` | Optional | `boolean` | `false` | Line style |
| `dotted` | Optional | `boolean` | `false` | Renders a dotted line (takes precedence over `dashed`) |
| `orientation` | Optional | `"horizontal" \| "vertical"` | `"horizontal"` | Line orientation |
| `plain` | Optional | `boolean` | `false` | Plain text style — no border around label |
<!-- END GENERATED: props -->

## Example

```tsx
import { Divider } from "@tetherto/mdk-react-devkit"

// Plain horizontal line
<Divider />

// With label
<Divider align="left">Section title</Divider>

// Dashed vertical
<Divider orientation="vertical" dashed />

// Dotted with centered label
<Divider dotted>or</Divider>
```

## Notes

- Labels are ignored on vertical dividers
- `dotted` takes precedence over `dashed` when both are set
