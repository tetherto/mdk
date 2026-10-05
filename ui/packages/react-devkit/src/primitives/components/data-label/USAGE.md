# `DataLabel`

Read-only period range label (`PERIOD: start - end`). Dates are formatted as
`dd/MM/yy` in the timezone from `useTimezone` (`@tetherto/mdk-react-adapter`).
Invalid or missing dates render as `--/--/--`.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `endDate` | Optional | `Date \| null` | - | Range end; formatted in the active timezone (`dd/MM/yy`) |
| `label` | Optional | `string` | `"PERIOD"` | Label text; defaults to `PERIOD` |
| `startDate` | Optional | `Date \| null` | - | Range start; formatted in the active timezone (`dd/MM/yy`) |
<!-- END GENERATED: props -->

## Example

```tsx
const start = new Date(2025, 0, 6)
const end = new Date(2025, 2, 15)

;<DataLabel startDate={start} endDate={end} />
```

## Notes

- Wrap your app in `<MdkProvider>` so the timezone store is available
- Styling uses the `mdk-data-label` BEM block; no size or color variants
- Use a dark toolbar background so default light text remains readable
