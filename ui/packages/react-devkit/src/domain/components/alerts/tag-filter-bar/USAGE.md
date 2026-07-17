# TagFilterBar

Cascader-based filter bar for the alerts table. Lets operators filter by tags, alert type, severity, and other site-specific dimensions.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `filterTags` | `string[]` | yes | — | Active tag filter values. |
| `localFilters` | `AlertLocalFilters` | yes | — | Current local filter state. |
| `onSearchTagsChange` | `(tags: string[]) => void` | yes | — | Called when tag filter changes. |
| `onLocalFiltersChange` | `(filters: AlertLocalFilters) => void` | yes | — | Called when any local filter changes. |
| `typeFiltersForSite` | `CascaderOption[]` | no | — | Site-specific type filter options. |
| `placeholder` | `string` | no | — | Search input placeholder. |
| `className` | `string` | no | — | Additional CSS class. |

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
