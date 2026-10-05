# `TimeframeControls` & `TimeframeWeekTreeContent`

Controls for selecting a reporting time frame: year, month, and optional week picker.

| Component                  | Description                                                                                        |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| `TimeframeControls`        | Full time-frame picker: year, month, and optional week selection in horizontal or stacked layout   |
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
| `visibleWeeks` | Required | `Week[]` | - | - |

### `TimeframeWeekTreeContent` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `selectedMonth` | Required | `number` | - | - |
| `selectedYear` | Required | `number` | - | - |
| `timezone` | Required | `string` | - | - |
<!-- END GENERATED: props -->

## Minimal example

```tsx
import { TimeframeControls } from "@tetherto/mdk-react-devkit";

<TimeframeControls
  onRangeChange={(range) => console.log(range)}
/>
```
