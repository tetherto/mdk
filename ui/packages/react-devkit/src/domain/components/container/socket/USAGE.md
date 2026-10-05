# Socket

Per-socket panel representing a single PDU slot in a container. Shows the miner slotted into that slot, its power/current draw, operating status, heatmap data (temperature or hashrate), and quick actions (add miner, edit flow).

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `clickDisabled` | Optional | `boolean` | `false` | Whether click is disabled |
| `cooling` | Optional | `boolean` | `undefined` | Cooling status |
| `current_a` | Optional | `number \| null` | `null` | Current in amperes |
| `enabled` | Optional | `boolean` | `false` | Whether socket is enabled |
| `heatmap` | Optional | `Heatmap \| null` | `null` | Heatmap configuration |
| `innerRef` | Optional | `React.ForwardedRef<HTMLDivElement>` | - | Forwarded ref for the container |
| `isContainerControlSupported` | Optional | `boolean` | `false` | Whether container control is supported |
| `isEditFlow` | Optional | `boolean` | `false` | Whether in edit flow mode |
| `isEmptyPowerDashed` | Optional | `boolean` | `false` | Whether to show dashed border for empty power |
| `miner` | Optional | `Miner \| null` | `null` | Miner data |
| `pdu` | Optional | `Pdu` | - | PDU information |
| `power_w` | Optional | `number \| null` | `null` | Power in watts |
| `selected` | Optional | `boolean` | `false` | Whether socket is selected |
| `socket` | Optional | `number \| null` | `null` | Socket number/index |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { Socket } from "@tetherto/mdk-react-devkit";

<Socket socket={1} enabled={true} power_w={3250} current_a={14.5} />
```
