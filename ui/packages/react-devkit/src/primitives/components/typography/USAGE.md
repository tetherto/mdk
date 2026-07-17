# Typography

Single component for all text rendering. Pick a semantic `variant` to get the
right element + base style; override `size` / `weight` / `color` ad hoc when
needed.

## Props

| Prop       | Type                                                                            | Required | Default     | Description                                  |
| ---------- | ------------------------------------------------------------------------------- | -------- | ----------- | -------------------------------------------- |
| `variant`  | `"heading1" \| "heading2" \| "heading3" \| "body" \| "secondary" \| "caption"`     | no       | `"body"`    | Determines the element and base style.        |
| `size`     | `"xs" \| "sm" \| "md" \| "lg" \| "xl" \| "2xl" \| "3xl" \| "4xl"`                   | no       | —           | Override font size (per-variant default).    |
| `weight`   | `"light" \| "normal" \| "medium" \| "semibold" \| "bold"`                          | no       | —           | Override font weight.                        |
| `color`    | `TypographyColor`                                                               | no       | `"default"` | Token-based text color.                       |
| `align`    | `"left" \| "center" \| "right"`                                                  | no       | —           | Text alignment.                              |
| `truncate` | `boolean`                                                                       | no       | `false`     | Single-line truncation with ellipsis.        |
| `className`| `string`                                                                        | no       | —           | Additional class names.                      |
| `children` | `ReactNode`                                                                     | yes      | —           | Text or inline content.                      |

All other native HTML attributes are forwarded onto the underlying element.

### Variant → element mapping

| Variant      | Element |
| ------------ | ------- |
| `heading1`   | `<h1>`  |
| `heading2`   | `<h2>`  |
| `heading3`   | `<h3>`  |
| `body`       | `<p>`   |
| `secondary`  | `<p>`   |
| `caption`    | `<span>`|

## Example

```tsx
<Typography variant="heading1">Operations dashboard</Typography>
<Typography variant="body">A high-level summary of your sites.</Typography>
<Typography variant="caption" color="muted">Updated 12s ago</Typography>
```

## Notes

- Use `variant` over raw `<h1>`/`<p>` tags so headings stay on-token.
- For numeric labels in cards, prefer `<Typography variant="heading3">` with
  `color="muted"` instead of inventing inline styles.
