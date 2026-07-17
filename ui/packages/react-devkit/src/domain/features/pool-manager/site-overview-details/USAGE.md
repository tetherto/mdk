# PoolManagerSiteOverviewDetails

Pool-manager site detail page: drilldown for a single site showing configured
pools, recent miner activity, and performance charts. Renders the breadcrumb
header (`Site Overview / <unitName>`) and delegates the body to
`SiteOverviewDetailsContainer`.

Use this as the `/pool-manager/sites/:id` route.

## Props

| Prop              | Type                              | Required | Default | Description                                              |
| ----------------- | --------------------------------- | -------- | ------- | -------------------------------------------------------- |
| `unit`            | `Device`                          | yes      | —       | The site (container unit) to render details for.         |
| `unitName`        | `string`                          | yes      | —       | Display name shown in the breadcrumb.                    |
| `poolConfig`      | `PoolConfigData[]`                | yes      | —       | Pool configurations powering the per-pool detail rows.   |
| `dataOptions`     | `SiteOverviewDetailsDataOptions`  | no       | —       | Optional knobs forwarded to `useSiteOverviewDetailsData`. |
| `isLoading`       | `boolean`                         | no       | `false` | Show a centered loader instead of the detail container.  |
| `backButtonClick` | `VoidFunction`                    | yes      | —       | Called when the operator clicks the "Site Overview" link. |

## Minimal example

```tsx
<PoolManagerSiteOverviewDetails
  unit={site}
  unitName={site.name}
  poolConfig={poolConfig}
  isLoading={isLoading}
  backButtonClick={() => router.push("/pool-manager/sites")}
/>
```

## Data contracts

- `Device` — `foundation/types/device`. The full site/container row.
- `PoolConfigData` — exported from `@tetherto/mdk-react-devkit`.
- `SiteOverviewDetailsDataOptions` — exported from
  `foundation/components/pool-manager/site-overview-details/use-site-overview-details-data`.

## Notes

- The page expects the parent route to fetch the site and pool data and pass
  it through props. Use the companion `useSiteOverviewDetailsData` hook (or
  your own TanStack Query) and forward the loading flag here.
- The breadcrumb second segment renders `unitName` after a `/` separator —
  pass a human-friendly name (e.g. site display name, not the raw id).
