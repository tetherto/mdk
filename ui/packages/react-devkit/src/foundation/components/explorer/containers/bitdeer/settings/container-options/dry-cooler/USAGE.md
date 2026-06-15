# DryCooler

Dry-cooler subsystem panel for Bitdeer containers. Shows two cooler groups with individual fan status indicators (on/off) and pump controls. Derives data from `container_specific.cooling_system` on the device object.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `data` | `UnknownRecord` | no | — | Container settings payload. `cooling_system.dry_cooler` is read for fan/pump state. |

## Minimal example

```tsx
import { DryCooler } from "@tetherto/mdk-react-devkit";

<DryCooler data={containerData} />
```
