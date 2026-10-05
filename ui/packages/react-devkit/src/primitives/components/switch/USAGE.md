# Switch

Toggle switch built on Radix UI. Controlled or uncontrolled.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `checked` | Optional | `boolean` | - | Controlled checked state |
| `className` | Optional | `string` | - | Custom className for the root element |
| `color` | Optional | `"success" \| "warning" \| "error" \| "primary" \| "default"` | `"default"` | Color variant when checked |
| `defaultChecked` | Optional | `boolean` | - | Uncontrolled initial checked state |
| `disabled` | Optional | `boolean` | `false` | Disable the switch |
| `onCheckedChange` | Optional | `((checked: boolean) => void)` | - | Change handler |
| `radius` | Optional | `"small" \| "none" \| "medium" \| "large" \| "full"` | `"none"` | Border radius variant |
| `size` | Optional | `"sm" \| "md" \| "lg"` | `"md"` | Size variant of the switch |
| `thumbClassName` | Optional | `string` | - | Custom className for the thumb element |
<!-- END GENERATED: props -->

## Example

```tsx
const [enabled, setEnabled] = useState(false);

<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
  <Switch id="notify" checked={enabled} onCheckedChange={setEnabled} />
  <Label htmlFor="notify">Enable notifications</Label>
</div>
```

## Notes

- Pair with a `Label` (via `htmlFor` / `id`) for accessibility
- Prefer `Switch` for boolean state where the change applies immediately;
  use `Checkbox` for selections inside a form
