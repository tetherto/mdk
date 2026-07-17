# DatePicker & DateRangePicker

Single-date and range-date pickers built on `react-day-picker`. The range
picker includes presets and a modal-style popover with Clear / Apply actions.

## `DatePicker` props

| Prop                | Type                            | Required | Default        | Description                       |
| ------------------- | ------------------------------- | -------- | -------------- | --------------------------------- |
| `selected`          | `Date`                          | no       | —              | Selected date.                    |
| `onSelect`          | `(date?: Date) => void`         | no       | —              | Setter.                           |
| `placeholder`       | `string`                        | no       | `"Pick a date"`| Trigger button placeholder.       |
| `dateFormat`        | `string`                        | no       | `"MM/dd/yyyy"` | `date-fns` format string.         |
| `disabled`          | `boolean`                       | no       | `false`        | Disable the trigger.              |
| `triggerClassName`  | `string`                        | no       | —              | Class names on the trigger button.|
| `calendarClassName` | `string`                        | no       | —              | Class names on the day-picker.    |

## `DateRangePicker` props

Adds `showPresets`, `presets: PresetItem[]`, `allowFutureDates`, and
`modalClassName`. `selected` / `onSelect` use `DateRange`.

## Example

```tsx
<DatePicker selected={date} onSelect={setDate} />
<DateRangePicker selected={range} onSelect={setRange} showPresets />
```

## Data contracts

```ts
type DateRange = { from: Date | undefined; to?: Date | undefined };
type PresetItem = { label: string; value: DateRange };
```
