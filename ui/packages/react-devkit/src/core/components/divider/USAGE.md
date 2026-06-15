# Divider

A styled horizontal or vertical separator line, optionally containing a label. Wraps Radix UI `@radix-ui/react-separator`.

## Props

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `orientation` | `'horizontal' \| 'vertical'` | no | `'horizontal'` | Line direction |
| `dashed` | `boolean` | no | `false` | Renders a dashed line |
| `dotted` | `boolean` | no | `false` | Renders a dotted line (takes precedence over `dashed`) |
| `children` | `React.ReactNode` | no | — | Label content rendered in the middle of the line (horizontal only) |
| `align` | `'left' \| 'center' \| 'right'` | no | `'center'` | Horizontal alignment of the label |
| `plain` | `boolean` | no | `false` | Renders the label without a surrounding border |
| `className` | `string` | no | — | Additional class for the root element |

## Example

```tsx
import { Divider } from "@tetherto/mdk-core-ui"

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

- Labels are ignored on vertical dividers.
- `dotted` takes precedence over `dashed` when both are set.
