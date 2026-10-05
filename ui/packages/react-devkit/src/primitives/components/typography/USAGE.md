# Typography

Single component for all text rendering. Pick a semantic `variant` to get the
right element + base style; override `size` / `weight` / `color` ad hoc when
needed.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `align` | Optional | `"center" \| "left" \| "right" \| "justify"` | - | Text alignment |
| `className` | Optional | `string` | - | Custom className |
| `color` | Optional | `"success" \| "warning" \| "error" \| "primary" \| "default" \| "muted"` | `"default"` | Token-based text color |
| `size` | Optional | `"sm" \| "md" \| "lg" \| "xs" \| "xl" \| "2xl" \| "3xl" \| "4xl"` | - | Text size; defaults to the variant's size when unset |
| `truncate` | Optional | `boolean` | `false` | Truncate text with ellipsis |
| `variant` | Optional | `"body" \| "caption" \| "secondary" \| "heading1" \| "heading2" \| "heading3"` | `"body"` | Determines the rendered HTML element and base style |
| `weight` | Optional | `"medium" \| "normal" \| "light" \| "semibold" \| "bold"` | - | Font weight; defaults to the variant's weight when unset |
<!-- END GENERATED: props -->

## Props detail

> **Props are generated from this component's TypeScript types, the source of truth.** The following are supplementary (object-prop shapes, allowed values, or passthrough props), not the full prop list.

All other native HTML attributes are forwarded onto the underlying element.

### Variant → element mapping

| Variant     | Element  |
| ----------- | -------- |
| `heading1`  | `<h1>`   |
| `heading2`  | `<h2>`   |
| `heading3`  | `<h3>`   |
| `body`      | `<p>`    |
| `secondary` | `<p>`    |
| `caption`   | `<span>` |

## Example

```tsx
<Typography variant="heading1">Operations dashboard</Typography>
<Typography variant="body">A high-level summary of your sites.</Typography>
<Typography variant="caption" color="muted">Updated 12s ago</Typography>
```

## Notes

- Use `variant` over raw `<h1>`/`<p>` tags so headings stay on-token
- For numeric labels in cards, prefer `<Typography variant="heading3">` with
  `color="muted"` instead of inventing inline styles
