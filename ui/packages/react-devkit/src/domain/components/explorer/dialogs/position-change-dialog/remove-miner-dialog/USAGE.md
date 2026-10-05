# `RemoveMinerDialog`

Confirmation modal for removing a miner from its slot. Renders nothing when `isRemoveMinerFlow` is `false`.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `isRemoveMinerFlow` | Required | `boolean` | - | Controls whether the dialog is open; `false` renders nothing |
| `onCancel` | Required | `VoidFunction` | - | Called when the action is cancelled |
| `headDevice` | Optional | `Device` | `{}` | The miner being removed |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { RemoveMinerDialog } from "@tetherto/mdk-react-devkit";

<RemoveMinerDialog
  isRemoveMinerFlow={true}
  onCancel={() => setOpen(false)}
  headDevice={device}
/>
```
