# Switch

Toggle switch built on Radix UI. Controlled or uncontrolled.

## Props

| Prop              | Type                              | Required | Default     | Description                       |
| ----------------- | --------------------------------- | -------- | ----------- | --------------------------------- |
| `checked`         | `boolean`                         | no       | —           | Controlled checked state.         |
| `defaultChecked`  | `boolean`                         | no       | —           | Uncontrolled initial state.       |
| `onCheckedChange` | `(checked: boolean) => void`      | no       | —           | Change handler.                   |
| `size`            | `"sm" \| "md" \| "lg"`             | no       | `"md"`      | Size variant.                     |
| `color`           | `ComponentColor`                  | no       | `"default"` | Color when checked.               |
| `radius`          | `BorderRadius`                    | no       | `"none"`    | Border radius variant.            |
| `disabled`        | `boolean`                         | no       | `false`     | Disable the switch.               |
| `className`       | `string`                          | no       | —           | Root class names.                 |
| `thumbClassName`  | `string`                          | no       | —           | Thumb (knob) class names.         |

## Example

```tsx
const [enabled, setEnabled] = useState(false);

<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
  <Switch id="notify" checked={enabled} onCheckedChange={setEnabled} />
  <Label htmlFor="notify">Enable notifications</Label>
</div>
```

## Notes

- Pair with a `Label` (via `htmlFor` / `id`) for accessibility.
- Prefer `Switch` for boolean state where the change applies immediately;
  use `Checkbox` for selections inside a form.
