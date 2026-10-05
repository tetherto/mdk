# `MinMaxAvg`

Displays Min, Max, and Avg labels with MDK chart footer styling (orange labels, grey values).

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `avg` | Optional | `string` | - | Average value (hidden if empty) |
| `className` | Optional | `string` | - | Additional root class |
| `max` | Optional | `string` | - | Maximum value (hidden if empty) |
| `min` | Optional | `string` | - | Minimum value (hidden if empty) |
<!-- END GENERATED: props -->

## Usage

```tsx
import { MinMaxAvg } from "@tetherto/mdk-react-devkit/primitives"

<MinMaxAvg min="10 TH/s" max="100 TH/s" avg="55 TH/s" />
```

Use with `ChartContainer` via the `minMaxAvg` prop (pre-formatted strings) or the `footer` slot.

With numeric data, pair `computeStats` and `formatMinMaxAvg` from chart utils:

```tsx
import { computeStats, formatMinMaxAvg } from "@tetherto/mdk-react-devkit/primitives"

const stats = computeStats(values)
const minMaxAvg = formatMinMaxAvg(stats, (v, key) =>
  key === "avg" ? `${v.toFixed(1)} TH/s` : `${v} TH/s`,
)
```
