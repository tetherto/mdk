# `EmptyState`

Placeholder shown when a list, table or panel has no data to display.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `description` | Required | `React.ReactNode` | - | Description text or ReactNode displayed below the image |
| `className` | Optional | `string` | - | Additional CSS class name |
| `image` | Optional | `EmptyStateImage` | `"default"` | Image to display. Use "default" for the standard illustration, "simple" for a minimal icon, or pass a custom ReactNode |
| `size` | Optional | `"sm" \| "md" \| "lg"` | `"md"` | Size variant controlling spacing and icon dimensions |
<!-- END GENERATED: props -->

## Example

```tsx
<EmptyState description="No miners found" />
<EmptyState description="No alerts in the selected range" image="simple" size="sm" />
<EmptyState
  description={<span>No data &mdash; try a different filter.</span>}
/>
```

## Notes

- Use inside the body of tables and cards, not as the root of a page
- Pass a custom `image` (e.g. a brand illustration) to replace the icon
