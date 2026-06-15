# OperationsEfficiency

Operational efficiency reporting view with three tabs: site-level, miner-type-level, and individual miner-unit-level breakdown.

| Component | Description |
|---|---|
| `OperationsEfficiency` | Top-level tabbed view. |
| `EfficiencySiteView` | Site-level efficiency chart and table. |
| `EfficiencyMinerTypeView` | Per-miner-type breakdown. |
| `EfficiencyMinerUnitView` | Per-unit breakdown. |

## OperationsEfficiency Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `defaultTab` | `EfficiencyTabValue` | no | — | Initially selected tab. |
| `siteView` | `EfficiencySiteViewProps` | no | — | Props forwarded to `EfficiencySiteView`. |
| `minerTypeView` | `EfficiencyMinerTypeViewProps` | no | — | Props forwarded to `EfficiencyMinerTypeView`. |
| `minerUnitView` | `EfficiencyMinerUnitViewProps` | no | — | Props forwarded to `EfficiencyMinerUnitView`. |

## Minimal example

```tsx
import { OperationsEfficiency } from "@tetherto/mdk-react-devkit";

<OperationsEfficiency />
```
