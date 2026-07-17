# BtcAveragePrice

Read-only BTC average price readout (`BTC Average Price: $97,500`) for reporting
toolbars. The value is formatted with `formatNumber` (grouping, no decimal places).

## Props

| Prop    | Type             | Required | Default               | Description                                                                                   |
| ------- | ---------------- | -------- | --------------------- | --------------------------------------------------------------------------------------------- |
| `price` | `number \| null` | no       | —                     | BTC price in USD. Omitted, null, NaN, non-finite, or negative → value shows `-` (`FALLBACK`). |
| `label` | `string`         | no       | `"BTC Average Price"` | Header text before the colon.                                                                 |

## Example

```tsx
<BtcAveragePrice price={97_500} />
```

Invalid or missing price still renders the label; the amount shows the fallback:

```tsx
<BtcAveragePrice price={null} />
// BTC Average Price: -
```

## Notes

- Styling uses the `mdk-btc-average-price` BEM block; no size or color variants.
- Use a dark toolbar background so default light text remains readable.
- `price={0}` renders `$0`.
