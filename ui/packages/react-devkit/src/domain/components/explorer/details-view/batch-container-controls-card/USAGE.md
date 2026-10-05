# `BatchContainerControlsCard`

Bulk-controls card for applying start/stop/mode changes to multiple selected containers at once. Reads `selectedContainers` from `devicesStore` and dispatches batch commands through `actionsStore`.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `alarmsDataItems` | Optional | `TimelineItemData[]` | - | Alarm timeline entries to display |
| `connectedMiners` | Optional | `unknown` | - | Array of currently connected miners |
| `isBatch` | Optional | `boolean` | `true` | Whether in batch (multi-select) mode |
| `isCompact` | Optional | `boolean` | - | Compact layout for tighter spaces |
| `onNavigate` | Optional | `(path: string) => void` | - | Navigation callback for alarm deep-links |
<!-- END GENERATED: props -->

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
