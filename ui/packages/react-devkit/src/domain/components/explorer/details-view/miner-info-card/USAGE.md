# MinerInfoCard

Info card for a single miner: serial number, model, firmware version, physical location, and a recent-activity summary. Renders a labelled list of `InfoItem` entries.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `data` | `InfoItem[]` | no | — | Array of label/value pairs to display. |
| `label` | `string` | no | `"Miner info"` | Card heading label. |

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
