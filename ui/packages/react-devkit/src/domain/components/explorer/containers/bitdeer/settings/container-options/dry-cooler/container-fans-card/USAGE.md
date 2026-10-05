# ContainerFansCard / ContainerFanLegend

`ContainerFansCard` renders a grid of fan status items for a container. `ContainerFanLegend` is the individual fan strip showing fan number and on/off icon.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

### `ContainerFanLegend` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `className` | Optional | `string` | - | Custom className |
| `enabled` | Optional | `boolean` | `false` | Running state; controls the icon and colour class |
| `index` | Optional | `number \| null` | - | Fan index/number to display |

### `ContainerFansCard` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `fansData` | Optional | `PumpItem[]` | - | Array of fan state objects. Renders an empty card when the array is empty; returns `null` when absent |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { ContainerFansCard, ContainerFanLegend } from "@tetherto/mdk-react-devkit";

<ContainerFansCard fansData={[{ enabled: true, index: 0 }, { enabled: false, index: 1 }]} />
<ContainerFanLegend index={1} enabled={true} />
```
