# EmptyState

Placeholder shown when a list, table or panel has no data to display.

## Props

| Prop          | Type                                       | Required | Default     | Description                                              |
| ------------- | ------------------------------------------ | -------- | ----------- | -------------------------------------------------------- |
| `description` | `ReactNode`                                | yes      | —           | Message shown below the image.                           |
| `image`       | `"default" \| "simple" \| ReactNode`        | no       | `"default"` | Built-in illustration, simple icon, or custom node.      |
| `size`        | `"sm" \| "md" \| "lg"`                      | no       | `"md"`      | Controls icon size and spacing.                          |
| `className`   | `string`                                   | no       | —           | Root class names.                                        |

## Example

```tsx
<EmptyState description="No miners found" />
<EmptyState description="No alerts in the selected range" image="simple" size="sm" />
<EmptyState
  description={<span>No data &mdash; try a different filter.</span>}
/>
```

## Notes

- Use inside the body of tables and cards, not as the root of a page.
- Pass a custom `image` (e.g. a brand illustration) to replace the icon.
