# ContainerFansCard / ContainerFanLegend

`ContainerFansCard` renders a grid of fan status items for a container. `ContainerFanLegend` is the individual fan strip showing fan number and on/off icon.

## ContainerFansCard Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `fansData` | `{ enabled?: boolean; index: number }[]` | no | — | Array of fan state objects. Returns `null` when empty or absent. |

## ContainerFanLegend Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `index` | `number \| null` | no | — | Fan number displayed as a label. |
| `enabled` | `boolean` | no | `false` | Running state; controls icon and colour class. |
| `className` | `string` | no | — | Additional CSS class. |

## Minimal example

```tsx
import { ContainerFansCard, ContainerFanLegend } from "@tetherto/mdk-react-devkit";

<ContainerFansCard fansData={[{ enabled: true, index: 0 }, { enabled: false, index: 1 }]} />
<ContainerFanLegend index={1} enabled={true} />
```
