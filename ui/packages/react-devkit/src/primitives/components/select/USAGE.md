# Select

Compound Radix-based select with `Select`, `SelectTrigger`, `SelectContent`,
`SelectItem`, `SelectValue`, and `SelectGroup` pieces.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `allowClear` | Optional | `boolean` | `false` | Show a clear button when a value is selected |
| `defaultValue` | Optional | `string` | - | Uncontrolled initial value |
| `onValueChange` | Optional | `((value: string) => void)` | - | Setter for the value |
| `value` | Optional | `string` | - | Controlled value |
<!-- END GENERATED: props -->

## Example

```tsx
<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select a container" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="cont-A">Container A</SelectItem>
    <SelectItem value="cont-B">Container B</SelectItem>
  </SelectContent>
</Select>
```
