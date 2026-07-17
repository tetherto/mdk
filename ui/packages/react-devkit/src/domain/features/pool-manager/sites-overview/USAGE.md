# PoolManagerSitesOverview

Pool-manager sites overview page: landing screen listing every site as a
status card with a snapshot of pools, miners online, hashrate, and active
incidents. Each card navigates to the site detail page.

Use this as the `/pool-manager/sites` route. For just the card list
primitive, drop down to `SitesOverviewStatusCardList`.

## Props

| Prop              | Type                          | Required | Default | Description                                                   |
| ----------------- | ----------------------------- | -------- | ------- | ------------------------------------------------------------- |
| `units`           | `ProcessedContainerUnit[]`    | yes      | —       | Sites to render (already normalised through `useSitesOverviewData`). |
| `poolConfig`      | `PoolConfigData[]`            | yes      | —       | Pool configurations powering each card's pool summary.        |
| `isLoading`       | `boolean`                     | no       | `false` | Show a skeleton placeholder while site data is fetching.      |
| `error`           | `unknown`                     | no       | —       | Surface a "could not load sites" message when defined.        |
| `backButtonClick` | `VoidFunction`                | yes      | —       | Called when the operator clicks the "Pool Manager" link.      |
| `onCardClick`     | `(unitId: string) => void`    | yes      | —       | Called with the clicked unit id — typically navigates.        |

## Minimal example

```tsx
<PoolManagerSitesOverview
  units={units}
  poolConfig={poolConfig}
  isLoading={isLoading}
  backButtonClick={() => router.push("/pool-manager")}
  onCardClick={(id) => router.push(`/pool-manager/sites/${id}`)}
/>
```

## Data contracts

- `ProcessedContainerUnit` — produced by the
  `useSitesOverviewData` hook in
  `foundation/components/pool-manager/hooks/use-sites-overview-data`.
- `PoolConfigData` — exported from `@tetherto/mdk-react-devkit`.

## Notes

- The page renders loading / error / empty states internally; you only need
  to forward the appropriate flags from your data hook.
- The component has no internal data fetching — wire it to your data hook of
  choice (e.g. `useSitesOverviewData` + TanStack Query) and forward the
  resulting `units`, `isLoading`, and `error`.
