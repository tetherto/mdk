# `PoolManagerSitesOverview`

Pool-manager sites overview page: landing screen listing every site as a
status card with a snapshot of pools, miners online, hashrate, and active
incidents. Each card navigates to the site detail page.

Use this as the `/pool-manager/sites` route. For just the card list
primitive, drop down to `SitesOverviewStatusCardList`.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `backButtonClick` | Required | `VoidFunction` | - | Called when the operator clicks the "Pool Manager" back link |
| `onCardClick` | Required | `(unitId: string) => void` | - | Called with the clicked unit id — typically navigates to `/sites/:id` |
| `poolConfig` | Required | `PoolConfigEntry[]` | - | Pool configurations powering each card's pool summary |
| `units` | Required | `ProcessedContainerUnit[]` | - | Sites to render (already normalised through `useSitesOverviewData`) |
| `error` | Optional | `unknown` | - | Shows a "Failed to load data" alert when defined (together with the internal pool-config fetch error) |
| `isLoading` | Optional | `boolean` | `false` | Show a skeleton placeholder while site data is fetching |
<!-- END GENERATED: props -->

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
  [`foundation/components/pool-manager/hooks/use-sites-overview-data`](../../../components/pool-manager/hooks/use-sites-overview-data.ts)
- `PoolConfigData` — exported from `@tetherto/mdk-react-devkit`

## Notes

- The page renders loading / error / empty states internally; you only need
  to forward the appropriate flags from your data hook
- The component has no internal data fetching — wire it to your data hook of
  choice (e.g. `useSitesOverviewData` + TanStack Query) and forward the
  resulting `units`, `isLoading`, and `error`
