# MiningPoolsPanel

Dashboard panel listing the site's mining pools — one row per
`minerpool-<poolType>-shelf-<index>` — with 24h BTC revenue, hashrate,
and an optional "Show details" popover.

Pair with `usePoolRows` from `@tetherto/mdk-react-adapter`; the hook
fans out the underlying `minerpoolStatsQuery` and returns rows
pre-shaped for this component.

## Props

| Prop            | Type                                | Required | Default          | Description                                              |
| --------------- | ----------------------------------- | -------- | ---------------- | -------------------------------------------------------- |
| `rows`          | `MiningPoolRow[]`                   | no       | `[]`             | Pool rows in display order.                              |
| `isLoading`     | `boolean`                           | no       | `false`          | Renders skeleton rows.                                   |
| `skeletonRows`  | `number`                            | no       | `2`              | Skeleton row count while `isLoading` is true.            |
| `label`         | `string`                            | no       | `"Mining Pools"` | Override the card title.                                 |
| `hideHeader`    | `boolean`                           | no       | `false`          | Hide the title row entirely.                             |
| `emptyMessage`  | `string`                            | no       | `"No pools"`     | Message shown when `rows` is empty.                      |
| `onShowDetails` | `(row: MiningPoolRow) => void`      | no       | —                | Click handler for the per-row details button.            |
| `className`     | `string`                            | no       | —                | Extra className on the root element.                     |

## Minimal example

```tsx
import { MiningPoolsPanel } from "@tetherto/mdk-react-devkit";
import { usePoolRows } from "@tetherto/mdk-react-adapter";

export const PoolsSection = () => {
  const { rows, isLoading } = usePoolRows();
  return <MiningPoolsPanel rows={rows} isLoading={isLoading} />;
};
```

## Data contract

```ts
type MiningPoolRow = {
  id: string;             // stable react key
  name: string;           // e.g. "minerpool-f2pool-shelf-0"
  revenue24hBtc?: number; // formatted as "0.0231 BTC" / "0 BTC"
  hashratePhs?: number;   // PH/s; rendered as TH/s when < 1 PH/s
  details?: PoolDetailItem[]; // optional — drives the "Show details" popover
};
```

## Notes

- The "Show details" button is only rendered when `row.details` is non-empty.
- Default popover layout uses the shared `<PoolDetailsCard>` primitive — the
  same one consumed by `<HeaderActions>`'s pool dropdown.
