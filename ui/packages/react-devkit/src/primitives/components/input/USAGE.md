# Input

Text input with label support, prefix/suffix slots, sizes, error state, and
a search-icon variant.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `error` | Optional | `string` | - | Validation error message. When provided, displays error styling (red border) and the message below the input |
| `id` | Optional | `string` | `auto-generated` | HTML id for the input. Required when using label for accessibility |
| `label` | Optional | `string` | - | Optional label displayed above the input |
| `prefix` | Optional | `React.ReactNode` | - | Prefix element displayed before the input (left side) |
| `size` | Optional | `"default" \| "medium"` | `"default"` | Size of the input - `default`: padding 10px 12px, icon 16px - `medium`: padding 6px 12px, icon 12px |
| `suffix` | Optional | `React.ReactNode` | - | Suffix element displayed after the input (right side) |
| `variant` | Optional | `"search" \| "default"` | `"default"` | Variant of the input - `default`: Standard text input - `search`: Input with magnifying glass icon on the right |
| `wrapperClassName` | Optional | `string` | - | Custom className for the root wrapper |
<!-- END GENERATED: props -->

## Example

```tsx
<Input label="MAC Address" placeholder="Enter MAC address" id="mac" />
<Input variant="search" placeholder="Search" />
<Input prefix="$" suffix="USD" placeholder="0.00" />
```
