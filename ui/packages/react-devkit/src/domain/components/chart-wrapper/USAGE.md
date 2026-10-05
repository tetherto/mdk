# `ChartWrapper`

Wrapper that handles three states for a chart's content area:

- **Loading** — shows a `Loader` skeleton (or custom node).
- **No data** — shows an `EmptyState` placeholder.
- **Has data** — shows the chart `children`.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `children` | Optional | `React.ReactNode` | - | Chart content to render |
| `className` | Optional | `string` | - | Custom className for the container |
| `customLoader` | Optional | `React.ReactNode` | `<Loader />` | Custom loader component to show when loading (overrides default spinner) |
| `customNoDataMessage` | Optional | `React.ReactNode` | - | Custom message or component to show when no data |
| `data` | Optional | `unknown[] \| Record<string, unknown>` | - | Chart data object (for LineChart with datasets) |
| `dataset` | Optional | `unknown[] \| Record<string, unknown>` | - | Chart dataset (for BarChart with direct dataset) |
| `isLoading` | Optional | `boolean` | `false` | Loading state |
| `loadingMinHeight` | Optional | `number` | `minHeight` | Minimum height for the loading skeleton (in pixels) Falls back to minHeight if not provided |
| `minHeight` | Optional | `number` | `400` | Minimum height for the container (in pixels) |
| `showNoDataPlaceholder` | Optional | `boolean` | `true` | Whether to show "no data" placeholder when data is empty |
<!-- END GENERATED: props -->

## Example

See [`chart-wrapper.example.tsx`](./chart-wrapper.example.tsx) for a runnable example.
