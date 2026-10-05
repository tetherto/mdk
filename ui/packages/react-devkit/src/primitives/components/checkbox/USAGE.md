# Checkbox

Controlled or uncontrolled checkbox built on Radix UI. Supports size, color
and border-radius variants. Indeterminate state via `checked="indeterminate"`.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `checked` | Optional | `CheckedState` | - | Controlled checked state |
| `className` | Optional | `string` | - | Custom className for the root element |
| `color` | Optional | `"success" \| "warning" \| "error" \| "primary" \| "default"` | `"primary"` | Color variant when checked |
| `defaultChecked` | Optional | `CheckedState` | - | Uncontrolled initial checked state |
| `disabled` | Optional | `boolean` | `false` | Disable the input |
| `indicatorClassName` | Optional | `string` | - | Custom className for the indicator element |
| `onCheckedChange` | Optional | `(((checked: CheckedState) => void) & ((checked: CheckedState) => void))` | - | Callback when the checked state changes |
| `radius` | Optional | `"small" \| "none" \| "medium" \| "large" \| "full"` | `"none"` | Border radius variant |
| `size` | Optional | `"sm" \| "md" \| "lg" \| "xs"` | `"md"` | Size variant of the checkbox |
<!-- END GENERATED: props -->

## Example

```tsx
const [checked, setChecked] = useState(false);
<Checkbox checked={checked} onCheckedChange={setChecked} />;

// Indeterminate
<Checkbox checked="indeterminate" />;
```

## Notes

- Always pair with a `<Label>` for accessibility
- Re-exports `CheckedState` from Radix for convenience
