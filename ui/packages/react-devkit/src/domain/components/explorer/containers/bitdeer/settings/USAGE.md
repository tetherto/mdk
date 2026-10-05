# BitdeerSettings

Settings tab for a Bitdeer container. Renders vendor-specific parameter display (MAC, serial number) and editable threshold forms for oil temperature and tank pressure monitoring, with color-coded alerts and sound-alert configuration.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `data` | Optional | `UnknownRecord` | `{}` | Container settings payload from the API |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { BitdeerSettings } from "@tetherto/mdk-react-devkit";

<BitdeerSettings data={containerSettings} />
```
