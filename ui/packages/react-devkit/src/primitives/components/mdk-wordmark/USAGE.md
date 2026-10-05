# MdkWordmark

The canonical MDK brand lockup, rendered as inline SVG so it tints to
`currentColor`. Use it in `<AppHeader>` via the `logo` slot, on
sign-in pages, or anywhere else the brand should appear.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `className` | Optional | `string` | - | Optional class hook on the outer `<svg>` |
| `size` | Optional | `"sm" \| "md" \| "lg"` | `"md"` | Visual size of the wordmark. `sm` ≈ 24px tall, `md` ≈ 32px, `lg` ≈ 64px |
| `title` | Optional | `string` | `"MDK"` | Accessible label |
<!-- END GENERATED: props -->

## When to use

- You need the MDK lockup at a known size (sm / md / lg).
- The surrounding text color or design token should drive the brand color
  via `currentColor`.

## Example

```tsx
import { MdkWordmark } from "@tetherto/mdk-react-devkit/primitives";

<MdkWordmark size="md" />;
```
