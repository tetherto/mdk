# BitMainImmersionControlsTab

Controls tab for a BitMain immersion container. Exposes start/stop, mode selection, and emergency actions alongside fan status, tank levels, and GPS.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `data` | `Device` | yes | — | Live device object. |

## Minimal example

```tsx
import { BitMainImmersionControlsTab } from "@tetherto/mdk-react-devkit";

<BitMainImmersionControlsTab data={device} />
```
