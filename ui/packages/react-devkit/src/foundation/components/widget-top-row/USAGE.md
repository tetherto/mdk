# WidgetTopRow

Compact header row used at the top of container / miner widgets — title,
per-category alarm badges, and the current power reading (or an error tooltip).

## Props

| Prop                | Type                                    | Required | Default | Description                            |
| ------------------- | --------------------------------------- | -------- | ------- | -------------------------------------- |
| `title`             | `string`                                | yes      | —       | Widget title.                          |
| `power`             | `number`                                | no       | —       | Power reading; rendered in kilo-units. |
| `unit`              | `string`                                | no       | —       | Power unit (e.g. `"kW"`).              |
| `statsErrorMessage` | `string \| ErrorWithTimestamp[] \| null` | no      | —       | Error tooltip content; replaces power. |
| `alarms`            | `Partial<Record<AlarmPropKey, AlarmInfoItem[]>>` | no | —    | Per-category alarm badges.             |
| `className`         | `string`                                | no       | —       | Additional class names.                |

## Example

```tsx
<WidgetTopRow title="Container 03" power={31500} unit="kW" alarms={alarms} />
```

## Notes

- Uses `useTimezoneFormatter` from `@tetherto/mdk-react-adapter`; wrap in
  `<MdkProvider>`.
