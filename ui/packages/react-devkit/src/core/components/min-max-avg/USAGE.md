# MinMaxAvg

Displays Min, Max, and Avg labels with MDK chart footer styling (orange labels, grey values).

## Props

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `min` | `string` | no | Minimum value (hidden if empty) |
| `max` | `string` | no | Maximum value (hidden if empty) |
| `avg` | `string` | no | Average value (hidden if empty) |
| `className` | `string` | no | Additional root class |

## Usage

```tsx
import { MinMaxAvg } from "@tetherto/mdk-react-devkit/core"

<MinMaxAvg min="10 TH/s" max="100 TH/s" avg="55 TH/s" />
```

Use with `ChartContainer` via the `minMaxAvg` prop (pre-formatted strings) or the `footer` slot.

With numeric data, pair `computeStats` and `formatMinMaxAvg` from chart utils:

```tsx
import { computeStats, formatMinMaxAvg } from "@tetherto/mdk-react-devkit/core"

const stats = computeStats(values)
const minMaxAvg = formatMinMaxAvg(stats, (v, key) =>
  key === "avg" ? `${v.toFixed(1)} TH/s` : `${v} TH/s`,
)
```
