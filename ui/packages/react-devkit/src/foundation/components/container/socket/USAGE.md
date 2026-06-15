# Socket

Per-socket panel representing a single PDU slot in a container. Shows the miner slotted into that slot, its power/current draw, operating status, heatmap data (temperature or hashrate), and quick actions (add miner, edit flow).

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `socket` | `number \| null` | no | — | Slot index displayed as a label. |
| `enabled` | `boolean` | no | `false` | Whether the slot is enabled. |
| `power_w` | `number \| null` | no | — | Power draw in watts. |
| `current_a` | `number \| null` | no | — | Current draw in amperes. |
| `miner` | `Miner \| null` | no | — | Miner data for the device in this slot. |
| `heatmap` | `Heatmap \| null` | no | — | Heatmap mode config; enables thermal/hashrate overlay. |
| `isEditFlow` | `boolean` | no | `false` | Shows the edit-flow reticle when `true`. |
| `clickDisabled` | `boolean` | no | `false` | Disables click interactions. |
| `cooling` | `boolean` | no | — | Cooling fan active state indicator. |
| `isEmptyPowerDashed` | `boolean` | no | `false` | Shows dashed border for empty-power slots. |
| `isContainerControlSupported` | `boolean` | no | `false` | Shows container-level action buttons. |
| `pdu` | `{ pdu?: string \| number }` | no | — | PDU reference metadata. |
| `innerRef` | `ForwardedRef<HTMLDivElement>` | no | — | Forwarded ref for the container div. |

## Minimal example

```tsx
import { Socket } from "@tetherto/mdk-react-devkit";

<Socket socket={1} enabled={true} power_w={3250} current_a={14.5} />
```
