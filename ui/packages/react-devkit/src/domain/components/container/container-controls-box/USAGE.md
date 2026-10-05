# `ContainerControlsBox`

Control panel for a single container providing start/stop actions, operating mode selection, fan controls, and operator shortcuts. Can run in batch mode to drive multiple selected containers simultaneously.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `onNavigate` | Required | `(path: string) => void` | - | Navigation callback used by alarm row click-throughs |
| `alarmsDataItems` | Optional | `TimelineItemData[]` | `[]` | Active alarm feed items to display inline |
| `data` | Optional | `Device` | - | The container device object |
| `isBatch` | Optional | `boolean` | `false` | When `true`, operates on `selectedDevices` instead of a single `data` record |
| `isCompact` | Optional | `boolean` | - | - |
| `pendingSubmissions` | Optional | `PendingSubmission[]` | `[]` | In-flight command queue; disables conflicting actions |
| `powerModesLog` | Optional | `UnknownRecord` | - | - |
| `selectedDevices` | Optional | `Device[]` | `[]` | Devices included in a batch operation |
| `tailLogData` | Optional | `UnknownRecord[]` | - | Recent log tail entries |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { ContainerControlsBox } from "@tetherto/mdk-react-devkit";

<ContainerControlsBox onNavigate={(path) => console.log(path)} />
```

## Notes

- Reads `devicesStore` and `actionsStore` internally — seed those stores via the adapter's `useDevices` / `useActions` hooks in your app
- `isCompact` and `powerModesLog` are declared on `ContainerControlsBoxProps` but have no effect: neither is destructured by the component, and the power-mode log actually rendered comes from an internal `useState` populated from `tailLogData`, not from the `powerModesLog` prop
