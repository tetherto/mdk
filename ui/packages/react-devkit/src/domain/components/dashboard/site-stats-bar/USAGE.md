# `SiteStatsBar`

Site-level summary strip sitting at the top of a dashboard page. Composes
`WidgetTopRow` (title + current power) and `GenericDataBox` (hashrate, miner
count, container count) into one horizontal card.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `title` | Required | `string` | - | Site label rendered in the header row |
| `className` | Optional | `string` | - | Optional class hook |
| `containerCount` | Optional | `number` | - | Total container count across the site |
| `hashrateUnit` | Optional | `string` | `"TH/s"` | Hashrate display unit — defaults to `TH/s` |
| `isLoading` | Optional | `boolean` | `false` | Render a skeleton bar while data is loading |
| `minerCount` | Optional | `number` | - | Total miner count across the site |
| `power` | Optional | `number` | - | Current site-level power consumption, in watts (or whatever `powerUnit` says) |
| `powerUnit` | Optional | `string` | `"kW"` | Display unit for `power` — defaults to `kW` |
| `totalHashrate` | Optional | `number` | - | Aggregate hashrate, in TH/s |
<!-- END GENERATED: props -->

## Example

```tsx
<SiteStatsBar
  title='Site A'
  power={1320}
  totalHashrate={92.3}
  minerCount={1024}
  containerCount={4}
/>
```

## Notes

- Renders `'—'` for any stat that's `undefined`. Pass `isLoading` for a
  cleaner first-paint experience
- `WidgetTopRow` reads timezone formatting via `useTimezoneFormatter`, so this
  component must live inside an `<MdkProvider>` tree
