# ActiveIncidentsCard

Summary card displaying a list of active incidents/alerts with severity
indicators, loading skeleton, and empty state.

## Props

| Prop           | Type                       | Required | Default          | Description                                          |
| -------------- | -------------------------- | -------- | ---------------- | ---------------------------------------------------- |
| `label`        | `string`                   | no       | `"Active Alerts"` | Header label shown above the list.                  |
| `isLoading`    | `boolean`                  | no       | `false`          | Show skeleton rows instead of items.                |
| `className`    | `string`                   | no       | —                | Additional class names appended to the root.        |
| `skeletonRows` | `number`                   | no       | `4`              | Number of skeleton rows shown when `isLoading`.     |
| `emptyMessage` | `string`                   | no       | —                | Message rendered when no items.                     |
| `items`        | `TIncidentRowProps[]`      | no       | `[]`             | Incident rows to render.                            |
| `onItemClick`  | `(id: string) => void`     | no       | —                | Called with the incident id when a row is clicked.  |

## Minimal example

```tsx
<ActiveIncidentsCard
  label="Active Alerts"
  items={alerts}
  onItemClick={(id) => router.push(`/alerts/${id}`)}
/>
```

## Data contracts

`TIncidentRowProps` is exported alongside the component. Each item needs at
least an `id`, `severity` (`critical | warning | info`), and `title`.

## Notes

- Designed for a side-panel placement, but works equally well as a section
  inside a dashboard page.
- Rows are virtualized via `@tanstack/react-virtual` — the card stays
  responsive even with thousands of incidents in `items`.
- Use `CurrentAlerts` / `HistoricalAlerts` instead when you need the full
  filterable, sortable data-table experience.
