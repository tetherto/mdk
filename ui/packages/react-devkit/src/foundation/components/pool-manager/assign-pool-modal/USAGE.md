# AssignPoolModal

Modal dialog for bulk-assigning a set of selected miners to a pool config.
Displays the miner list, a pool selector with metadata (unit/miner counts,
last-updated time), an endpoints preview, and an optional credential template
preview. Submission is async; the modal stays open with a loading state until
the parent resolves.

## Props

| Prop         | Type                                            | Required | Default | Description                                                  |
| ------------ | ----------------------------------------------- | -------- | ------- | ------------------------------------------------------------ |
| `isOpen`     | `boolean`                                       | yes      | —       | Controls modal visibility.                                   |
| `onClose`    | `() => void`                                    | yes      | —       | Called when the modal is dismissed (× button or backdrop).   |
| `onSubmit`   | `(values: { pool: PoolSummary }) => Promise<void>` | yes   | —       | Called with the selected pool when the form is submitted.    |
| `miners`     | `Device[]`                                      | yes      | —       | Miners to display in the selection table.                    |
| `poolConfig` | `PoolConfigData[]`                              | yes      | —       | Available pool configurations to populate the pool selector. |

## Minimal example

```tsx
import { useState } from 'react'
import { AssignPoolModal } from '@tetherto/mdk-react-devkit'

export const Example = () => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Assign Pool</button>
      <AssignPoolModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSubmit={async ({ pool }) => {
          await assignMinersToPool(selectedMinerIds, pool.id)
          setIsOpen(false)
        }}
        miners={selectedMiners}
        poolConfig={poolConfigs}
      />
    </>
  )
}
```

## Data contracts

- `Device` — `foundation/types/device.ts`; only `id`, `code`, `tags`, `info.container`, `info.poolConfig`, and `last.snap.stats.status` are read.
- `PoolConfigData` — `foundation/components/pool-manager/hooks/use-pool-configs.ts`; the hook parses `poolUrls` into typed `PoolEndpoint[]` and resolves pool metadata.
- `PoolSummary` — `foundation/components/pool-manager/types.ts`; returned in `onSubmit`.

## Notes

- The modal does not fetch data itself — pass pre-fetched `miners` and `poolConfig` from the parent.
- The credential template preview section is gated by the `SHOW_CREDENTIAL_TEMPLATE` constant in `pool-manager-constants.ts`.
- Use `PoolManagerMinerExplorer` when you need a full miner-selection workflow before opening this modal.
