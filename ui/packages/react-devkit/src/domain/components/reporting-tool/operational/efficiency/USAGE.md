# OperationsEfficiency

Operational efficiency reporting view with three tabs: site-level, miner-type-level, and individual miner-unit-level breakdown.

| Component | Description |
|---|---|
| `OperationsEfficiency` | Top-level tabbed view. |
| `EfficiencySiteView` | Site-level efficiency chart and table. |
| `EfficiencyMinerTypeView` | Per-miner-type breakdown. |
| `EfficiencyMinerUnitView` | Per-unit breakdown. |

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `defaultTab` | Optional | `"site-view" \| "miner-type-view" \| "mining-unit-view"` | `"site-view"` | Initially selected tab |
| `minerTypeView` | Optional | `EfficiencyMinerTypeViewProps` | - | Props forwarded to `EfficiencyMinerTypeView` |
| `minerUnitView` | Optional | `EfficiencyMinerUnitViewProps` | - | Props forwarded to `EfficiencyMinerUnitView` |
| `siteView` | Optional | `EfficiencySiteViewProps` | - | Props forwarded to `EfficiencySiteView` |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { OperationsEfficiency } from "@tetherto/mdk-react-devkit";

<OperationsEfficiency />
```
