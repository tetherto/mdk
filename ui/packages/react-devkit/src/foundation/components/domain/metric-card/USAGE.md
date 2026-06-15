# MetricCard

Compact card displaying a labelled metric value with an optional unit suffix.
Supports highlighted (orange accent) and transparent-colour display states,
making it suitable for pool-performance dashboards, financial summary rows, and
inline KPI strips where visual weight needs to be controlled.

## Props

| Prop                | Type                          | Required | Default | Description                                                              |
| ------------------- | ----------------------------- | -------- | ------- | ------------------------------------------------------------------------ |
| `label`             | `string`                      | yes      | —       | Text label shown above the value.                                        |
| `unit`              | `string`                      | yes      | —       | Unit suffix appended after the value (e.g. `"TH/s"`, `"W"`, `"USD"`).   |
| `value`             | `number \| string \| null`    | yes      | —       | Metric value to display.                                                 |
| `bgColor`           | `string`                      | no       | —       | Custom background colour (CSS colour string). Defaults to `BLACK_ALPHA_05`. |
| `className`         | `string`                      | no       | —       | Additional class names appended to the root element.                     |
| `noMinWidth`        | `boolean`                     | no       | `false` | Removes the default minimum width so the card shrinks to content.        |
| `isHighlighted`     | `boolean`                     | no       | `false` | Renders the value in orange to draw attention.                           |
| `isValueMedium`     | `boolean`                     | no       | `false` | Applies a medium-weight variant to the value typography.                 |
| `showDashForZero`   | `boolean`                     | no       | `false` | Displays `—` instead of `0` when value is zero.                         |
| `isTransparentColor`| `boolean`                     | no       | `false` | Renders the value in a low-opacity white for de-emphasised display.      |

## Minimal example

```tsx
<MetricCard label="Hashrate" unit="TH/s" value={102.4} />
```

## Notes

- When `value` is `null` the component renders the FALLBACK placeholder (`—`) from `@core`.
- `showDashForZero` and `null` values both render the same FALLBACK string.
- `isHighlighted` takes precedence over `isTransparentColor` for colour resolution.
- The background colour is applied via a `--mdk-metric-card-bg` CSS custom property, allowing it to be overridden at the `@layer app` level.
