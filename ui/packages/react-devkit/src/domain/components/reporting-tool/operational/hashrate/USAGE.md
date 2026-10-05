# Hashrate

Operational hashrate reporting view with three tabs:

- **Site View** - aggregated site hashrate trend over the selected date
  range, with an optional miner-type filter.
- **Miner Type View** - latest hashrate per miner model.
- **Mining Unit View** - latest hashrate per container.

Each tab fetches independently (different `groupBy` axes and date ranges);
the composite is a thin tabs shell that stitches them together via per-tab
prop bags.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `defaultTab` | Optional | `"site-view" \| "miner-type-view" \| "mining-unit-view"` | `"site-view"` | Tab selected on first render. Defaults to the Site View |
| `minerTypeView` | Optional | `HashrateMinerTypeViewProps` | - | Props forwarded to the Miner Type View tab |
| `miningUnitView` | Optional | `HashrateMiningUnitViewProps` | - | Props forwarded to the Mining Unit View tab |
| `siteView` | Optional | `HashrateSiteViewProps` | - | Props forwarded to the Site View tab |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { Hashrate } from "@tetherto/mdk-react-devkit";

<Hashrate />
```

## Wired example

```tsx
import { Hashrate } from "@tetherto/mdk-react-devkit";

const minerQuery = useGetHashrateGroupedQuery({ groupBy: "miner", ...minerRange });
const containerQuery = useGetHashrateGroupedQuery({ groupBy: "container", ...containerRange });

<Hashrate
  siteView={{
    log: minerQuery.data?.log,
    isLoading: minerQuery.isLoading,
    dateRange: minerRange,
    onDateRangeChange: setMinerRange,
  }}
  minerTypeView={{
    log: minerQuery.data?.log,
    isLoading: minerQuery.isLoading,
    dateRange: minerRange,
    onDateRangeChange: setMinerRange,
  }}
  miningUnitView={{
    log: containerQuery.data?.log,
    isLoading: containerQuery.isLoading,
    dateRange: containerRange,
    onDateRangeChange: setContainerRange,
  }}
/>
```
