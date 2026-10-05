# `RevenueChart`

Stacked bar chart showing monthly Bitcoin revenue across multiple mining sites.
Values are automatically displayed in BTC when averages exceed 1 BTC, or converted to Sats otherwise.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `data` | Optional | `RevenueDataItem[]` | `[]` | Raw API response, each entry is one time period with site IDs as dynamic keys |
| `isLoading` | Optional | `boolean` | `false` | Shows a loading spinner while data is being fetched |
| `legendAlign` | Optional | `"center" \| "start" \| "end"` | `"start"` | Chart legend alignment |
| `legendPosition` | Optional | `"left" \| "right" \| "top" \| "bottom"` | `"bottom"` | Chart legend position |
| `siteList` | Optional | `(string \| SiteItem)[]` | `[]` | List to resolve site IDs to display names |
<!-- END GENERATED: props -->

## When to use

Use this component inside a financial reporting view where you want to visualize per-site revenue trends over time as a stacked column chart.

## Data shape

```ts
// Each array element is one monthly time bucket:
{
  timeKey: 'Jan 2024',    // X-axis label
  period: 'monthly',
  timestamp: 1704067200000,
  'site-a': 0.0042,       // Revenue in BTC for site-a
  'site-b': 0.0031,       // Revenue in BTC for site-b
}
```

## Example

```tsx
import { RevenueChart } from '@tetherto/mdk-react-devkit/domain'

const siteList = [
  { id: 'site-a', name: 'Site A' },
  { id: 'site-b', name: 'Site B' },
]

<RevenueChart
  data={revenueData}
  siteList={siteList}
  isLoading={isLoadingRevenue}
/>
```

## Currency auto-detection

The component compares the per-label daily average against 1 BTC:
- Any average **> 1 BTC** → display in **BTC** (₿)  
- All averages **≤ 1 BTC** → multiply values × 1 000 000 and display in **Sats**

This mirrors the behavior of the source data from the Tetherto mining API.
