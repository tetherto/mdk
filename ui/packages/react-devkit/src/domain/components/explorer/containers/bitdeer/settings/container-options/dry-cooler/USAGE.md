# `DryCooler`

Dry-cooler subsystem panel for Bitdeer containers. Shows two cooler groups with individual fan status indicators (on/off) and pump controls. Derives data from `container_specific.cooling_system` on the device object.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `data` | Optional | `UnknownRecord` | - | Container settings payload. `cooling_system.dry_cooler` is read for fan state; `cooling_system.oil_pump` and `cooling_system.water_pump` are read for pump state |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { DryCooler } from "@tetherto/mdk-react-devkit";

<DryCooler data={containerData} />
```
