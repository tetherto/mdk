# Input

Text input with label support, prefix/suffix slots, sizes, error state, and
a search-icon variant.

## Props

| Prop               | Type                       | Required | Default     | Description                                |
| ------------------ | -------------------------- | -------- | ----------- | ------------------------------------------ |
| `label`            | `string`                   | no       | —           | Label rendered above the input.            |
| `id`               | `string`                   | no       | auto-generated | Required when using `label` for a11y.   |
| `variant`          | `"default" \| "search"`    | no       | `"default"` | `search` shows a magnifying glass icon.    |
| `size`             | `"default" \| "medium"`    | no       | `"default"` | Size token.                                |
| `error`            | `string`                   | no       | —           | Validation error message (red border).     |
| `prefix`           | `ReactNode`                | no       | —           | Element before the input.                  |
| `suffix`           | `ReactNode`                | no       | —           | Element after the input.                   |
| `wrapperClassName` | `string`                   | no       | —           | Class names on the root wrapper.           |
| …                  | All other `<input>` attrs  | —        | —           | Standard React props.                      |

## Example

```tsx
<Input label="MAC Address" placeholder="Enter MAC address" id="mac" />
<Input variant="search" placeholder="Search" />
<Input prefix="$" suffix="USD" placeholder="0.00" />
```
