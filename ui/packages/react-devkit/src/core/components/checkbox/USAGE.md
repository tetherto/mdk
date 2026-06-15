# Checkbox

Controlled or uncontrolled checkbox built on Radix UI. Supports size, color
and border-radius variants. Indeterminate state via `checked="indeterminate"`.

## Props

| Prop                 | Type                                            | Required | Default     | Description                                |
| -------------------- | ----------------------------------------------- | -------- | ----------- | ------------------------------------------ |
| `checked`            | `boolean \| "indeterminate"`                    | no       | —           | Controlled checked state.                  |
| `defaultChecked`     | `boolean`                                       | no       | —           | Uncontrolled initial checked state.        |
| `onCheckedChange`    | `(checked: CheckedState) => void`               | no       | —           | Change handler.                            |
| `size`               | `"xs" \| "sm" \| "md" \| "lg"`                   | no       | `"md"`     | Size variant.                              |
| `color`              | `ComponentColor`                                | no       | `"primary"` | Color when checked.                        |
| `radius`             | `BorderRadius`                                  | no       | `"none"`    | Border radius variant.                     |
| `disabled`           | `boolean`                                       | no       | `false`     | Disable the input.                         |
| `className`          | `string`                                        | no       | —           | Root class names.                          |
| `indicatorClassName` | `string`                                        | no       | —           | Indicator (check icon) class names.        |

## Example

```tsx
const [checked, setChecked] = useState(false);
<Checkbox checked={checked} onCheckedChange={setChecked} />;

// Indeterminate
<Checkbox checked="indeterminate" />;
```

## Notes

- Always pair with a `<Label>` for accessibility.
- Re-exports `CheckedState` from Radix for convenience.
