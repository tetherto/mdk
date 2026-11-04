# `DataLabel`

Read-only period range label (`PERIOD: start - end`). Dates are formatted as
`dd/MM/yy` in the `timezone` prop (the browser's timezone by default; pass
`useTimezone().timezone` from `@tetherto/mdk-react-adapter` to follow the user's choice).
Invalid or missing dates render as `--/--/--`.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `endDate` | Optional | `Date \| null` | - | Range end; formatted in the active timezone (`dd/MM/yy`) |
| `label` | Optional | `string` | `"PERIOD"` | Label text; defaults to `PERIOD` |
| `startDate` | Optional | `Date \| null` | - | Range start; formatted in the active timezone (`dd/MM/yy`) |
| `timezone` | Optional | `string` | - | IANA timezone the dates are shown in (e.g. `'UTC'`). Defaults to the browser's timezone; pass `useTimezone().timezone` to follow the user's selected one |
<!-- END GENERATED: props -->

## Example

```tsx
const start = new Date(2025, 0, 6)
const end = new Date(2025, 2, 15)

;<DataLabel startDate={start} endDate={end} />
```

## Notes

- Pure: pass `timezone` to override the browser's, and `useTimezone().timezone` from `@tetherto/mdk-react-adapter` to follow the
  user's selection
- Styling uses the `mdk-data-label` BEM block; no size or color variants
- Use a dark toolbar background so default light text remains readable
