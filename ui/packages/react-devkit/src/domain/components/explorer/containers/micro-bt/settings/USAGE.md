# MicroBTSettings

Settings form for a MicroBT container with vendor-specific operating limits (temperature thresholds, cooling parameters).

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `containerSettings` | Optional | `{ thresholds?: Record<string, unknown> \| undefined; } \| null` | `null` | Container settings with custom thresholds |
| `data` | Optional | `Device` | - | Device data |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { MicroBTSettings } from "@tetherto/mdk-react-devkit";

<MicroBTSettings data={device} />
```
