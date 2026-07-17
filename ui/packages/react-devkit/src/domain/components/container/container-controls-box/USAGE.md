# ContainerControlsBox

Control panel for a single container providing start/stop actions, operating mode selection, fan controls, and operator shortcuts. Can run in batch mode to drive multiple selected containers simultaneously.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `data` | `Device` | no | — | The container device object. |
| `isBatch` | `boolean` | no | `false` | When `true`, operates on `selectedDevices` instead of a single `data` record. |
| `isCompact` | `boolean` | no | `false` | Renders a compact variant suitable for sidebars. |
| `selectedDevices` | `Device[]` | no | `[]` | Devices included in a batch operation. |
| `pendingSubmissions` | `PendingSubmission[]` | no | `[]` | In-flight command queue; disables conflicting actions. |
| `alarmsDataItems` | `TimelineItemData[]` | no | `[]` | Active alarm feed items to display inline. |
| `tailLogData` | `UnknownRecord[]` | no | — | Recent log tail entries. |
| `powerModesLog` | `UnknownRecord` | no | — | Historical power-mode change log. |
| `onNavigate` | `(path: string) => void` | yes | — | Navigation callback used by alarm row click-throughs. |

## Minimal example

```tsx
import { ContainerControlsBox } from "@tetherto/mdk-react-devkit";

<ContainerControlsBox onNavigate={(path) => console.log(path)} />
```

## Notes

- Reads `devicesStore` and `actionsStore` internally — seed those stores via the adapter's `useDevices` / `useActions` hooks in your app.
