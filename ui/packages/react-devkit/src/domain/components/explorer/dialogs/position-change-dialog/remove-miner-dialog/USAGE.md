# RemoveMinerDialog

Confirmation modal for removing a miner from its slot, with an optional reason-capture step when `isRemoveMinerFlow` is `true`.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `headDevice` | `Device` | no | `{}` | The miner being removed. |
| `isRemoveMinerFlow` | `boolean` | yes | — | `true` for remove flow, `false` for swap flow. |
| `onCancel` | `VoidFunction` | yes | — | Called when the action is cancelled. |

## Minimal example

```tsx
import { RemoveMinerDialog } from "@tetherto/mdk-react-devkit";

<RemoveMinerDialog
  isRemoveMinerFlow={true}
  onCancel={() => setOpen(false)}
  headDevice={device}
/>
```
