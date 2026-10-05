# `WidgetTopRow`

Compact header row used at the top of container / miner widgets — title,
per-category alarm badges, and the current power reading (or an error tooltip).

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `title` | Required | `string` | - | Widget title |
| `alarms` | Optional | `Partial<Record<AlarmPropKey, Alert[]>>` | - | Per-category alarm badges |
| `className` | Optional | `string` | - | Additional class names |
| `power` | Optional | `number` | - | Power reading; rendered in kilo-units |
| `statsErrorMessage` | Optional | `string \| ErrorWithTimestamp[] \| null` | - | Error tooltip content; replaces power |
| `unit` | Optional | `string` | - | Power unit (e.g. `"kW"`) |
<!-- END GENERATED: props -->

## Example

```tsx
<WidgetTopRow title="Container 03" power={31500} unit="kW" alarms={alarms} />
```

## Notes

- Uses `useTimezoneFormatter` from `@tetherto/mdk-react-adapter`; wrap in
  `<MdkProvider>`
