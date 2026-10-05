# Logs

A set of components for displaying paginated incident and activity log lists inside a labeled card.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

### `LogActivityIcon` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `status` | Required | `string` | - | - |

### `LogDot` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `status` | Required | `string` | - | Severity string for color mapping |
| `type` | Required | `string` | - | `'Incidents'` renders a colored circle; `'Activity'` renders an activity icon |

### `LogItem` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `data` | Required | `LogData` | - | - |
| `onLogClicked` | Optional | `((uuid: string) => void)` | - | - |

### `LogRow` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `log` | Required | `LogData` | - | Log entry data |
| `type` | Required | `string` | - | Log type (controls dot appearance) |
| `onLogClicked` | Optional | `((uuid: string) => void)` | - | Click handler |
| `style` | Optional | `React.CSSProperties` | - | Inline style for the row container |

### `LogsCard` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `emptyMessage` | Optional | `string` | `"No active incidents"` | Message shown when `logsData` is empty |
| `isDark` | Optional | `boolean` | `false` | Applies dark card theme |
| `isLoading` | Optional | `boolean` | `false` | Shows skeleton rows while loading |
| `label` | Optional | `string` | - | Card header label |
| `logsData` | Optional | `LogData[]` | `[]` | Array of log entries to display |
| `onLogClicked` | Optional | `(uuid: string) => void` | - | Fired with the log UUID when a row is clicked |
| `pagination` | Optional | `LogPagination` | - | Pagination config; hides pagination when on page 1 or data is empty |
| `skeletonRows` | Optional | `number` | `4` | Number of skeleton rows shown during loading |
| `type` | Optional | `string` | - | Log type (`'Incidents'` or `'Activity'`); controls the `LogDot` appearance |
<!-- END GENERATED: props -->

## Exports

| Name | Description |
| ---- | ----------- |
| `LogsCard` | High-level card containing a list of `LogRow` items, skeleton loading state, empty state, and optional pagination |
| `LogRow` | A single log entry row (status dot + item content) |
| `LogItem` | The content area of a log entry (title, subtitle, body, and optional navigate arrow) |
| `LogDot` | Status indicator dot rendered to the left of a `LogItem` — appearance varies by `type` |

### `LogData`


> **Props are generated from this component's TypeScript types, the source of truth.** The following are supplementary (object-prop shapes, allowed values, or passthrough props), not the full prop list.

| Field | Type | Description |
| ----- | ---- | ----------- |
| `uuid` | `string` | Unique identifier |
| `title` | `string` | Primary text |
| `subtitle` | `string` | Secondary text (truncated with `title` tooltip) |
| `body` | `string` | Body text; `\|`-separated values are split into separate lines |
| `status` | `string` | Severity / status string (`'Critical'`, `'High'`, `'Medium'`, activity status, etc.) |

### `LogPagination`

| Field | Type | Description |
| ----- | ---- | ----------- |
| `current` | `number` | Current page number |
| `total` | `number` | Total number of items |
| `pageSize` | `number` | Items per page |
| `handlePaginationChange` | `(page: number) => void` | Fired when the user changes the page |

## Example

```tsx
import { LogsCard } from "@tetherto/mdk-react-devkit"

<LogsCard
  label="Recent Incidents"
  type="Incidents"
  logsData={incidents}
  isLoading={loading}
  onLogClicked={(uuid) => navigate(`/incidents/${uuid}`)}
  pagination={{
    current: page,
    total: totalCount,
    pageSize: 10,
    handlePaginationChange: setPage,
  }}
/>
```

## Notes

- `LOG_TYPES` constants (`'Incidents'`, `'Activity'`) are exported from [`constants.tsx`](./constants.tsx)
- Severity colors map `'Critical'` → red, `'High'` → high-severity style, `'Medium'` → medium-severity style
