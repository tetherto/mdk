# `TagFilterBar`

Cascader-based filter bar for the alerts table. Lets operators filter by tags, alert type, severity, and other site-specific dimensions.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `filterTags` | Required | `string[]` | - | Active tag filter values |
| `localFilters` | Required | `AlertLocalFilters` | - | Current local filter state |
| `onLocalFiltersChange` | Required | `(filters: AlertLocalFilters) => void` | - | Called when any local filter changes |
| `onSearchTagsChange` | Required | `(tags: string[]) => void` | - | Called when tag filter changes |
| `className` | Optional | `string` | - | Additional CSS class |
| `placeholder` | Optional | `string` | - | Search input placeholder |
| `typeFiltersForSite` | Optional | `CascaderOption[]` | - | Site-specific overrides for the "type" filter children. If provided, the "Type" filter group will use these instead of the defaults |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { TagFilterBar } from "@tetherto/mdk-react-devkit";

<TagFilterBar
  filterTags={[]}
  localFilters={{}}
  onSearchTagsChange={(tags) => setTags(tags)}
  onLocalFiltersChange={(f) => setFilters(f)}
/>
```
