# TimelineSelector

Dropdown for picking the dashboard time range — wraps `core/Select` with the
canonical option list from `getTimelineOptions`. Pair with
`useDashboardTimeRange` from `@tetherto/mdk-react-adapter` to drive the
hashrate / consumption / power-mode chart hooks.

## Props

| Prop        | Type                          | Required | Default              | Description                                       |
| ----------- | ----------------------------- | -------- | -------------------- | ------------------------------------------------- |
| `value`     | `string`                      | yes      | —                    | Current timeline (e.g. `'1m'`, `'5m'`).           |
| `onChange`  | `(next: string) => void`      | yes      | —                    | Called whenever the user picks a new option.     |
| `options`   | `TimelineOption[]`            | no       | `getTimelineOptions()` | Override the list — useful for localised labels. |
| `label`     | `string`                      | no       | `"Time range"`       | aria-label / placeholder text.                   |
| `className` | `string`                      | no       | —                    | Class hook on the trigger element.               |

## Example

```tsx
const { timeline, setTimeline, options } = useDashboardTimeRange()

<TimelineSelector value={timeline} onChange={setTimeline} options={options} />
```
