# `TimeframeControls`, `TimeframeWeekFlatContent` & `TimeframeWeekTreeContent`

Controls for selecting a reporting time frame: year, month, and optional week picker.

| Component                  | Description                                                                                        |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| `TimeframeControls`        | Full time-frame picker: year, month, and optional week selection in horizontal or stacked layout   |
| `TimeframeWeekFlatContent` | Flat week list used inside `TimeframeControls`                                                     |
| `TimeframeWeekTreeContent` | Hierarchical year → month → week tree used inside `TimeframeControls`                              |

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

### `TimeframeControls` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `dateRange` | Optional | `TimeframeControlsDateRange` | - | Current date range |
| `hint` | Optional | `string` | - | Helper text below the controls |
| `isMonthSelectVisible` | Optional | `boolean` | `true` | Show month selector |
| `isWeekSelectVisible` | Optional | `boolean` | `true` | Show week selector |
| `layout` | Optional | `"horizontal" \| "stacked"` | `"horizontal"` | Layout direction |
| `onRangeChange` | Optional | `TimeframeControlsOnRangeChange` | - | Called when the range changes |
| `onReset` | Optional | `VoidFunction` | - | Called when the Reset button is clicked |
| `onTimeframeTypeChange` | Optional | `(type: TimeframeTypeValue) => void` | - | Called when timeframe type changes |
| `showResetButton` | Optional | `boolean` | `false` | Shows the Reset button |
| `timeframeType` | Optional | `null \| "month" \| "week" \| "year"` | - | Active timeframe type |

### `TimeframeWeekFlatContent` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `visibleWeeks` | Required | `Week[]` | - | Weeks to list, as returned by `weeksOfMonth(year, month, timezone)` |

### `TimeframeWeekTreeContent` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `selectedMonth` | Required | `number` | - | Month (0-11) whose section starts expanded |
| `selectedYear` | Required | `number` | - | Year whose section starts expanded |
| `timezone` | Required | `string` | - | IANA timezone the week labels and boundaries are computed in |

### `TimeframeControlsDateRange`

| Field | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `end` | Required | `number` | - | Range end (epoch ms); matched with `start` against calendar weeks to restore a week selection |
| `start` | Required | `number` | - | Range start (epoch ms); the year/month/week pickers sync to this date |

### `Week`

| Field | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `bucketMonth` | Required | `number` | - | Month (0-11) of the week's end date in the selected timezone; sent as `month` to `onRangeChange` |
| `bucketYear` | Required | `number` | - | Year of the week's end date in the selected timezone; sent as `year` to `onRangeChange` |
| `end` | Required | `Date` | - | Sunday 23:59:59.999 (local time) that closes the week, capped to the end of yesterday |
| `label` | Required | `string` | - | Option text, `DD/MM - DD/MM` in the selected timezone |
| `start` | Required | `Date` | - | Monday 00:00:00.000 (local time) that opens the week |
| `disabled` | Optional | `boolean` | - | True when the week starts after the end of yesterday; the option is shown but not selectable |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { TimeframeControls } from "@tetherto/mdk-react-devkit";

<TimeframeControls
  onRangeChange={(range) => console.log(range)}
/>
```
