# Button

Primary action button with variants, sizes, loading state, icon placement, and
full-width layout. Forwards refs and all native `<button>` attributes.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `contentClassName` | Optional | `string` | - | Class names applied to the inner content wrapper |
| `disabled` | Optional | `boolean` | `false` | Disable the button |
| `fullWidth` | Optional | `boolean` | `false` | Make the button stretch to fill its container |
| `icon` | Optional | `React.ReactNode` | - | Icon node rendered alongside `children` |
| `iconPosition` | Optional | `"left" \| "right"` | `"left"` | Icon placement relative to children |
| `loading` | Optional | `boolean` | `false` | Show a spinner instead of the content and disable the button |
| `size` | Optional | `"sm" \| "md" \| "lg"` | - | Size token (`sm`, `md`, `lg`) |
| `type` | Optional | `"button" \| "submit" \| "reset"` | `"button"` | Native button type |
| `variant` | Optional | `"icon" \| "link" \| "primary" \| "danger" \| "secondary" \| "tertiary" \| "nav-link" \| "outline" \| "ghost"` | `"secondary"` | Visual variant (e.g. `primary`, `secondary`, `ghost`) |
<!-- END GENERATED: props -->

## Example

```tsx
<Button variant="primary" onClick={handleSave}>Save</Button>
<Button loading>Submitting…</Button>
```

## Data contracts

`ButtonVariant` and `ComponentSize` are exported from [`core/types`](../../types/index.ts).

## Notes

- `aria-busy` is set when `loading` is true
- When `loading` is true the inner spinner is the only child; `icon` and
  `children` are hidden.
