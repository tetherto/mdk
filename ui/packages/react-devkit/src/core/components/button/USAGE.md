# Button

Primary action button with variants, sizes, loading state, icon placement, and
full-width layout. Forwards refs and all native `<button>` attributes.

## Props

| Prop               | Type                                     | Required | Default       | Description                                  |
| ------------------ | ---------------------------------------- | -------- | ------------- | -------------------------------------------- |
| `variant`          | `ButtonVariant`                          | no       | `"secondary"` | Visual variant (`primary`, `secondary`, …).  |
| `size`             | `ComponentSize`                          | no       | —             | `"sm"`, `"md"`, `"lg"`.                      |
| `loading`          | `boolean`                                | no       | `false`       | Show spinner and disable button.             |
| `disabled`         | `boolean`                                | no       | `false`       | Disable the button.                          |
| `fullWidth`        | `boolean`                                | no       | `false`       | Stretch to fill the container.               |
| `icon`             | `ReactNode`                              | no       | —             | Icon rendered alongside `children`.          |
| `iconPosition`     | `"left" \| "right"`                      | no       | `"left"`      | Icon placement.                              |
| `contentClassName` | `string`                                 | no       | —             | Class names applied to the inner wrapper.    |
| `type`             | `"button" \| "submit" \| "reset"`        | no       | `"button"`    | Native button type.                          |
| …                  | All other `<button>` HTML attributes     | —        | —             | Standard React props.                        |

## Example

```tsx
<Button variant="primary" onClick={handleSave}>Save</Button>
<Button loading>Submitting…</Button>
```

## Data contracts

`ButtonVariant` and `ComponentSize` are exported from `core/types`.

## Notes

- `aria-busy` is set when `loading` is true.
- When `loading` is true the inner spinner is the only child; `icon` and
  `children` are hidden.
