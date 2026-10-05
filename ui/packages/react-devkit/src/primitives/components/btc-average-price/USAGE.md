# `BtcAveragePrice`

Read-only BTC average price readout (`BTC Average Price: $97,500`) for reporting
toolbars. The value is formatted with `formatNumber` (grouping, no decimal places).

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `label` | Optional | `string` | `"BTC Average Price"` | Label for the BTC average price |
| `price` | Optional | `number \| null` | - | BTC price in USD; formatted with grouping and no decimal places. When `null`, `undefined`, non-finite, or negative, the value shows `-` (`FALLBACK` from format utils) |
<!-- END GENERATED: props -->

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

- Styling uses the `mdk-btc-average-price` BEM block; no size or color variants
- Use a dark toolbar background so default light text remains readable
- `price={0}` renders `$0`
