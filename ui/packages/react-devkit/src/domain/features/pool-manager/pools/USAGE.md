# `PoolManagerPools`

Pool-manager pools page: accordion list of every configured pool. Each item
shows a one-line header (name, status, priority) and expands to reveal the
pool body (per-pool stats, edit, delete). Optional "Add Pool" CTA is gated by
the `ADD_POOL_ENABLED` feature flag.

Use this as the `/pool-manager/pools` route. For just the row primitives, drop
down to `PoolCollapseItemHeader` / `PoolCollapseItemBody`.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `backButtonClick` | Required | `VoidFunction` | - | Called when the operator clicks the "Pool Manager" back link |
| `poolConfig` | Required | `PoolConfigEntry[]` | - | Array of pool configurations to render |
<!-- END GENERATED: props -->

## Minimal example

```tsx
<PoolManagerPools
  poolConfig={poolConfig}
  backButtonClick={() => router.push("/pool-manager")}
/>
```

## Requirements

- Render inside `<MdkProvider>`. The "Add Pool" modal uses
  `useContextualModal` from `@tetherto/mdk-react-adapter`.

## Data contracts

- `PoolConfigData` — exported from
  `@tetherto/mdk-react-devkit` (originates in
  [`foundation/components/pool-manager/hooks/use-pool-configs`](../../../components/pool-manager/hooks/use-pool-configs.ts)).
  Mirrors the API pool-config object.

## Notes

- Pool data is normalized via `usePoolConfigs` — the component handles
  loading and error states internally (`Loader` + `CoreAlert`)
- The "Add Pool" button is gated by `ADD_POOL_ENABLED`. Set it in the
  [`foundation/components/pool-manager/pool-manager-constants`](../../../components/pool-manager/pool-manager-constants.ts) module if you
  fork the library; the default is `false` in `@tetherto/mdk-react-devkit`
- Multiple rows can be expanded simultaneously — the accordion uses
  `type="multiple"`
