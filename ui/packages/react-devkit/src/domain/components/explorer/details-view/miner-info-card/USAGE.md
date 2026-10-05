# MinerInfoCard

Info card for a single miner: serial number, model, firmware version, physical location, and a recent-activity summary. Renders a labelled list of `InfoItem` entries.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `data` | Optional | `InfoItem[]` | - | Array of label/value pairs to display |
| `label` | Optional | `string` | `"Miner info"` | Card heading label |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { MinerInfoCard } from "@tetherto/mdk-react-devkit";

const info = [
  { label: "Serial", value: "SN-001234" },
  { label: "Model", value: "Antminer S19" },
  { label: "Firmware", value: "1.0.2" },
];

<MinerInfoCard data={info} label="Miner info" />
```
