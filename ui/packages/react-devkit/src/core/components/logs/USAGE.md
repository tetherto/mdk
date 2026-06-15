# Logs

A set of components for displaying paginated incident and activity log lists inside a labeled card.

## Exports

| Name | Description |
| ---- | ----------- |
| `LogsCard` | High-level card containing a list of `LogRow` items, skeleton loading state, empty state, and optional pagination |
| `LogRow` | A single log entry row (status dot + item content) |
| `LogItem` | The content area of a log entry (title, subtitle, body, and optional navigate arrow) |
| `LogDot` | Status indicator dot rendered to the left of a `LogItem` — appearance varies by `type` |

### `LogsCard` Props

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `logsData` | `LogData[]` | no | `[]` | Array of log entries to display |
| `type` | `string` | no | — | Log type (`'Incidents'` or `'Activity'`); controls the `LogDot` appearance |
| `label` | `string` | no | — | Card header label |
| `isDark` | `boolean` | no | `false` | Applies dark card theme |
| `isLoading` | `boolean` | no | `false` | Shows skeleton rows while loading |
| `skeletonRows` | `number` | no | `4` | Number of skeleton rows shown during loading |
| `emptyMessage` | `string` | no | `'No active incidents'` | Message shown when `logsData` is empty |
| `pagination` | `LogPagination` | no | — | Pagination config; hides pagination when on page 1 or data is empty |
| `onLogClicked` | `(uuid: string) => void` | no | — | Fired with the log UUID when a row is clicked |

### `LogData`

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

### `LogRow` Props

| Prop | Type | Required | Description |
| ---- | ---- | -------- | ----------- |
| `log` | `LogData` | yes | Log entry data |
| `type` | `string` | yes | Log type (controls dot appearance) |
| `style` | `CSSProperties` | no | Inline style for the row container |
| `onLogClicked` | `(uuid: string) => void` | no | Click handler |

### `LogDot` Props

| Prop | Type | Required | Description |
| ---- | ---- | -------- | ----------- |
| `type` | `string` | yes | `'Incidents'` renders a colored circle; `'Activity'` renders an activity icon |
| `status` | `string` | yes | Severity string for color mapping |

## Example

```tsx
import { LogsCard } from "@tetherto/mdk-core-ui"

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

- `LOG_TYPES` constants (`'Incidents'`, `'Activity'`) are exported from `constants.tsx`.
- Severity colors map `'Critical'` → red, `'High'` → high-severity style, `'Medium'` → medium-severity style.
