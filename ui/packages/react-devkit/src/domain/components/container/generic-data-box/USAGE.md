# `GenericDataBox`

Reusable labelled stat box for container summary panels. Renders a vertical list of label-value-unit rows with optional highlight and color/flash states driven by threshold rules.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `data` | Optional | `DataItem[]` | `[]` | Array of data items to display |
| `fallbackValue` | Optional | `unknown` | - | Fallback value when value is undefined |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { GenericDataBox } from "@tetherto/mdk-react-devkit";

<GenericDataBox
  data={[
    { label: "Temperature", value: 45, units: "°C" },
    { label: "Pressure", value: 2.5, units: "bar", isHighlighted: true },
  ]}
/>
```
