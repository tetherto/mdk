# RevenueChart

Stacked bar chart showing monthly Bitcoin revenue across multiple mining sites.
Values are automatically displayed in BTC when averages exceed 1 BTC, or converted to Sats otherwise.

## When to use

Use this component inside a multi-site financial reporting view where you want to visualise per-site revenue trends over time as a stacked column chart.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `RevenueDataItem[]` | `[]` | Raw API response — each entry is one time period with site IDs as dynamic keys |
| `isLoading` | `boolean` | `false` | Shows a loading spinner while data is being fetched |
| `siteList` | `(string \| SiteItem)[]` | `[]` | Optional list to resolve site IDs to display names |
| `legendPosition` | `'top' \| 'right' \| 'bottom' \| 'left'` | `'bottom'` | Chart legend position |
| `legendAlign` | `'start' \| 'center' \| 'end'` | `'start'` | Chart legend alignment |

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
import { RevenueChart } from '@tetherto/mdk-react-devkit/foundation'

const siteList = [
  { id: 'site-a', name: 'Paraguay' },
  { id: 'site-b', name: 'Uruguay' },
]

<RevenueChart
  data={revenueData}
  siteList={siteList}
  isLoading={isLoadingRevenue}
/>
```

## Currency auto-detection

The component compares the per-label daily average against 1 BTC.
- Any average **> 1 BTC** → display in **BTC** (₿)  
- All averages **≤ 1 BTC** → multiply values × 1 000 000 and display in **Sats**

This mirrors the behaviour of the source data from the Tetherto mining API.
