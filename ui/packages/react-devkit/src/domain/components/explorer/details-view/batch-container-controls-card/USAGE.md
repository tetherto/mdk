# BatchContainerControlsCard

Bulk-controls card for applying start/stop/mode changes to multiple selected containers at once. Reads `selectedContainers` from `devicesStore` and dispatches batch commands through `actionsStore`.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `isBatch` | `boolean` | no | `true` | Whether in batch (multi-select) mode. |
| `isCompact` | `boolean` | no | — | Compact layout for tighter spaces. |
| `connectedMiners` | `unknown` | no | — | Array of currently connected miners. |
| `alarmsDataItems` | `TimelineItemData[]` | no | — | Alarm timeline entries to display. |
| `onNavigate` | `(path: string) => void` | no | — | Navigation callback for alarm deep-links. |

## Minimal example

```tsx
import { BatchContainerControlsCard } from "@tetherto/mdk-react-devkit";

<BatchContainerControlsCard
  isBatch={true}
  isCompact={false}
  connectedMiners={[]}
  alarmsDataItems={[]}
  onNavigate={(path) => router.push(path)}
/>
```
