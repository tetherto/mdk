# StatusItem

Compact labelled status pill used inside Bitmain container panels for boolean or enum readings. Renders a label alongside a coloured indicator driven by the `status` value.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `label` | Optional | `string` | - | Status label text |
| `status` | Optional | `"warning" \| "normal" \| "fault" \| "unavailable"` | - | Status type |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { StatusItem } from "@tetherto/mdk-react-devkit";

<StatusItem label="Circulation Pump" status="normal" />
```
