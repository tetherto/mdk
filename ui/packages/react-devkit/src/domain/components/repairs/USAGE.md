# `RepairLogChangesSubRow`

Expandable sub-row that lists the spare-part changes recorded in a repair batch
action. Each non-miner repair action is resolved against its device to show the
part type, serial number, MAC address, and whether the part was added or
removed. It renders a non-paginated `DataTable`.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `batchAction` | Required | `object` | - | The repair batch action whose part changes should be displayed |
| `devices` | Required | `Partial<{ id: string; rack: string; info: Partial<{ serialNum: string; macAddress: string; }>; }>[]` | - | Devices referenced by the batch action, pre-fetched by the parent |
| `isLoading` | Optional | `boolean` | `false` | Show a spinner while the parent is still fetching `devices` |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { RepairLogChangesSubRow } from '@tetherto/mdk-react-devkit'

export const Example = () => {
  const { data: devices, isLoading } = useDevices(batchAction)

  return (
    <RepairLogChangesSubRow
      batchAction={batchAction}
      devices={devices ?? []}
      isLoading={isLoading}
    />
  )
}
```

## Data contracts

- `RepairBatchAction` — [`foundation/components/repairs/types.ts`](./types.ts). The component
  reads `params[].params[0]` for each action's `comment`, `id`, `rackId`, and
  `info.parentDeviceId`
- `RepairDevice` — [`foundation/components/repairs/types.ts`](./types.ts). Only `id`, `rack`,
  `info.serialNum`, and `info.macAddress` are read

## Notes

- The component does not fetch data itself — pass pre-fetched `devices` from the
  parent (e.g. query the things API by the action ids), consistent with the rest
  of the devkit
- Miner actions are filtered out; only spare-part changes are shown.
- A part is labelled **Removed** when it has no `parentDeviceId`, otherwise
  **Added**
- Part type is resolved via `MINER_TYPE_NAME_MAP` then `SparePartNames`, falling
  back to `Unknown`
