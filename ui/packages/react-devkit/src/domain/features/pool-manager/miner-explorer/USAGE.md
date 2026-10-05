# `PoolManagerMinerExplorer`

Pool-manager miner explorer page: searchable / filterable table of miners
with multi-select and an "Assign Pool" bulk action. Submits the chosen pool
assignment as a pending action through the adapter `actions` store.

Use this as the `/pool-manager/miners` route. For just the table primitive,
drop down to `MinerExplorer`.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `backButtonClick` | Required | `VoidFunction` | - | Called when the operator clicks the "Pool Manager" back link |
| `miners` | Required | `ListThingsDevice[]` | - | Miners to render in the explorer table |
| `poolConfig` | Required | `PoolConfigEntry[]` | - | Pool configurations powering the "Assign Pool" dropdown |
<!-- END GENERATED: props -->

## Minimal example

```tsx
<PoolManagerMinerExplorer
  miners={miners}
  poolConfig={poolConfig}
  backButtonClick={() => router.push("/pool-manager")}
/>
```

## Requirements

- Render inside `<MdkProvider>`. The page reads / writes the `actions` store
  (`useActions`), reads the auth store (`useCheckPerm` against
  `AUTH_PERMISSIONS.ACTIONS:WRITE`), and uses `useContextualModal` for the
  Assign Pool dialog.

## Behavior

- The "Assign Pool" button is gated behind `ASSIGN_POOL_POPUP_ENABLED` and
  the `actions:write` permission. Tooltips explain why it's disabled
- Submitting a pool assignment calls `setAddPendingSubmissionAction` with
  `ACTION_TYPES.SETUP_POOLS` for every selected miner, then resets the
  selection via the `MinerExplorerRef` imperative handle
- A success `notifyInfo` toast fires when the action is queued

## Data contracts

- `ListThingsDevice` — exported from `@tetherto/mdk-ui-foundation`
- `PoolConfigData` — exported from `@tetherto/mdk-react-devkit`
