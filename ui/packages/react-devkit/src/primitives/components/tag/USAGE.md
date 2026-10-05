# Tag

A small inline label used to display categories, statuses, or metadata. Renders as a `<span>` with a color variant modifier.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `children` | Optional | `React.ReactNode` | - | Children content |
| `className` | Optional | `string` | - | Custom className for the root element |
| `color` | Optional | `"red" \| "blue" \| "green" \| "amber" \| "dark"` | `"dark"` | Color variant of the tag |
<!-- END GENERATED: props -->

## Example

```tsx
import { Tag } from "@tetherto/mdk-react-devkit"

<Tag>Default</Tag>
<Tag color="green">Active</Tag>
<Tag color="red">Error</Tag>
<Tag color="amber">Warning</Tag>
<Tag color="blue">Info</Tag>
```
