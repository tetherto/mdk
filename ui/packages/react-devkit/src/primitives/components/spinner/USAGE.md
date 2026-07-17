# Spinner

Loading indicator. Two animation styles (`square` and `circle`), three sizes,
optional label and a fullscreen overlay mode.

## Props

| Prop         | Type                                     | Required | Default     | Description                              |
| ------------ | ---------------------------------------- | -------- | ----------- | ---------------------------------------- |
| `size`       | `"sm" \| "md" \| "lg"`                    | no       | `"md"`      | Size variant.                            |
| `color`      | `"primary" \| "secondary"`                | no       | `"primary"` | Color variant.                           |
| `type`       | `"square" \| "circle"`                    | no       | `"square"`  | Animation style.                         |
| `speed`      | `"slow" \| "normal" \| "fast"`            | no       | `"normal"`  | Animation speed.                         |
| `label`      | `string`                                 | no       | —           | Caption shown below the spinner.         |
| `fullScreen` | `boolean`                                | no       | `false`     | Cover the viewport with a backdrop.      |
| `className`  | `string`                                 | no       | —           | Additional class names.                  |

All other `<div>` attributes are forwarded.

## Example

```tsx
<Spinner />
<Spinner size="lg" type="circle" label="Loading miners…" />
<Spinner fullScreen />
```

## Notes

- Uses `role="status"` and `aria-live="polite"` for screen-reader updates.
- Inside `<Button loading>`, the button automatically renders its own spinner.
