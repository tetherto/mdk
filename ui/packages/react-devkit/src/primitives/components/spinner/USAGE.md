# Spinner

Loading indicator. Two animation styles (`square` and `circle`), three sizes,
optional label and a fullscreen overlay mode.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `className` | Optional | `string` | - | Custom className for the root element |
| `color` | Optional | `"primary" \| "secondary"` | `"primary"` | Color variant of the spinner |
| `fullScreen` | Optional | `boolean` | `false` | Whether to display in fullscreen mode |
| `label` | Optional | `string` | - | Optional label text to display below the spinner |
| `size` | Optional | `"sm" \| "md" \| "lg"` | `"md"` | Size variant of the spinner |
| `speed` | Optional | `"slow" \| "normal" \| "fast"` | `"normal"` | Speed of the animation |
| `type` | Optional | `"circle" \| "square"` | `"square"` | Type of spinner animation |
<!-- END GENERATED: props -->

## Example

```tsx
<Spinner />
<Spinner size="lg" type="circle" label="Loading miners…" />
<Spinner fullScreen />
```

## Notes

- Uses `role="status"` and `aria-live="polite"` for screen-reader updates
- Inside `<Button loading>`, the button automatically renders its own spinner
