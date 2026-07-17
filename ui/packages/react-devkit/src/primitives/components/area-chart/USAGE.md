# AreaChart

Presentational Chart.js area chart (`Line` with fill). Data must be provided
via props — no data fetching.

## Props

| Prop      | Type                            | Required | Default | Description                              |
| --------- | ------------------------------- | -------- | ------- | ---------------------------------------- |
| `data`    | `ChartJS<"line">["data"]`       | yes      | —       | Chart.js data object.                    |
| `options` | `ChartJS<"line">["options"]`    | no       | —       | Merged with defaults.                    |
| `tooltip` | `ChartTooltipConfig`            | no       | —       | Custom HTML tooltip configuration.       |
| `height`  | `number`                        | no       | `300`   | Pixel height.                            |
| `className`| `string`                       | no       | —       | Additional class names.                  |

## Example

```tsx
<AreaChart data={areaData} options={options} height={300} />
```
