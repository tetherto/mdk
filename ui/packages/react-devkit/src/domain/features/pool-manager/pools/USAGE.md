# PoolManagerPools

Pool-manager pools page: accordion list of every configured pool. Each item
shows a one-line header (name, status, priority) and expands to reveal the
pool body (per-pool stats, edit, delete). Optional "Add Pool" CTA is gated by
the `ADD_POOL_ENABLED` feature flag.

Use this as the `/pool-manager/pools` route. For just the row primitives, drop
down to `PoolCollapseItemHeader` / `PoolCollapseItemBody`.

## Props

| Prop              | Type                | Required | Default | Description                                              |
| ----------------- | ------------------- | -------- | ------- | -------------------------------------------------------- |
| `poolConfig`      | `PoolConfigData[]`  | yes      | —       | Pool configurations to render (typically from the API).  |
| `backButtonClick` | `VoidFunction`      | yes      | —       | Called when the operator clicks the "Pool Manager" link. |

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
  `foundation/components/pool-manager/hooks/use-pool-configs`). Mirrors the API
  pool-config object.

## Notes

- Pool data is normalised via `usePoolConfigs` — the component handles
  loading and error states internally (`Loader` + `CoreAlert`).
- The "Add Pool" button is gated by `ADD_POOL_ENABLED`. Set it in the
  `foundation/components/pool-manager/pool-manager-constants` module if you
  fork the library; the default is `false` in `@tetherto/mdk-react-devkit`.
- Multiple rows can be expanded simultaneously — the accordion uses
  `type="multiple"`.
