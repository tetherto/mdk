# PoolManagerMinerExplorer

Pool-manager miner explorer page: searchable / filterable table of miners
with multi-select and an "Assign Pool" bulk action. Submits the chosen pool
assignment as a pending action through the adapter `actions` store.

Use this as the `/pool-manager/miners` route. For just the table primitive,
drop down to `MinerExplorer`.

## Props

| Prop              | Type                | Required | Default | Description                                              |
| ----------------- | ------------------- | -------- | ------- | -------------------------------------------------------- |
| `miners`          | `Device[]`          | yes      | —       | Devices to render. Same shape consumed by `MinerExplorer`. |
| `poolConfig`      | `PoolConfigData[]`  | yes      | —       | Powers the "Assign Pool" modal's pool picker.            |
| `backButtonClick` | `VoidFunction`      | yes      | —       | Called when the operator clicks the "Pool Manager" link. |

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

## Behaviour

- The "Assign Pool" button is gated behind `ASSIGN_POOL_POPUP_ENABLED` and
  the `actions:write` permission. Tooltips explain why it's disabled.
- Submitting a pool assignment calls `setAddPendingSubmissionAction` with
  `ACTION_TYPES.SETUP_POOLS` for every selected miner, then resets the
  selection via the `MinerExplorerRef` imperative handle.
- A success `notifyInfo` toast fires when the action is queued.

## Data contracts

- `Device` — `foundation/types/device`.
- `PoolConfigData` — exported from `@tetherto/mdk-react-devkit`.
