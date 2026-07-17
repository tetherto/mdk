# ChartWrapper

Wrapper that handles three states for a chart's content area:

- **Loading** — shows a `Loader` skeleton (or custom node).
- **No data** — shows an `EmptyState` placeholder.
- **Has data** — shows the chart `children`.

## Props

| Prop                    | Type                            | Required | Default              | Description                              |
| ----------------------- | ------------------------------- | -------- | -------------------- | ---------------------------------------- |
| `children`              | `ReactNode`                     | no       | —                    | Chart content.                           |
| `data`                  | `Record<string, unknown> \| unknown[]` | no | —                  | Line-chart data (datasets list).         |
| `dataset`               | `Record<string, unknown> \| unknown[]` | no | —                  | Bar-chart dataset.                       |
| `isLoading`             | `boolean`                       | no       | `false`              | Show loader.                             |
| `customLoader`          | `ReactNode`                     | no       | `<Loader />`         | Replace the default loader.              |
| `showNoDataPlaceholder` | `boolean`                       | no       | `true`               | Toggle empty placeholder.                |
| `customNoDataMessage`   | `string \| ReactNode`           | no       | —                    | Custom empty content.                    |
| `minHeight`             | `number`                        | no       | `400`                | Min height (px).                         |
| `loadingMinHeight`      | `number`                        | no       | `minHeight`          | Min height for the loading state.        |
| `className`             | `string`                        | no       | —                    | Additional class names.                  |

## Example

See `chart-wrapper.example.tsx` for a runnable example.
