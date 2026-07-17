# LineChart

Time-series line chart built on `lightweight-charts`. Supports multi-series
data, custom tooltips, vertical / horizontal crosshair labels, manual zoom,
point markers, fixed-timezone formatting, and auto-scaling.

For most use cases prefer wrapping in `ChartContainer` or `LineChartCard` so
you get title, legend, range selector, and loading / empty states for free.

## Key props

| Prop               | Type                                  | Required | Default | Description                          |
| ------------------ | ------------------------------------- | -------- | ------- | ------------------------------------ |
| `data`             | `LineChartData`                       | yes      | —       | `{ datasets: LineDataset[] }`.       |
| `chartRef`         | `MutableRefObject<IChartApi \| null>` | no       | —       | Hold the underlying chart API.       |
| `yTicksFormatter`  | `(value: number) => string`           | no       | —       | Y-axis tick formatter.               |
| `priceFormatter`   | `(value: number) => string`           | no       | —       | Take-precedence formatter.           |
| `timeline`         | `string`                              | no       | —       | Current timeline (drives auto-fit).  |
| `fixedTimezone`    | `string`                              | no       | —       | IANA timezone (applies offset).      |
| `unit`             | `string`                              | no       | `""`    | Unit appended in tooltips.           |
| `height`           | `number`                              | no       | `240`   | Pixel height.                        |

See `types.ts` for the full prop set (20+ props).

## Example

```tsx
<LineChart
  data={{ datasets: [{ label: "Hashrate", borderColor: "#4f9ef5", data: points }] }}
  height={320}
  unit="TH/s"
/>
```

## Data contracts

```ts
type LineDataPoint = { x: number; y: number | null | undefined };
type LineDataset = {
  label?: string;
  visible?: boolean;
  borderColor: string;
  borderWidth?: number;
  data: LineDataPoint[];
};
type LineChartData = { datasets: LineDataset[] };
```
