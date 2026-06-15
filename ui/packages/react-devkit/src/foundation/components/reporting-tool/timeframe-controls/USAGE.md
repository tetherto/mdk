# TimeframeControls & TimeframeWeekTreeContent

Controls for selecting a reporting time frame: year, month, and optional week picker.

| Component | Description |
|---|---|
| `TimeframeControls` | Full time-frame picker: year, month, and optional week selection in horizontal or vertical layout. |
| `TimeframeWeekTreeContent` | Hierarchical year → month → week tree used inside `TimeframeControls`. |

## TimeframeControls Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `hint` | `string` | no | — | Helper text below the controls. |
| `dateRange` | `DateRange` | no | — | Current date range. |
| `isMonthSelectVisible` | `boolean` | no | `true` | Show month selector. |
| `isWeekSelectVisible` | `boolean` | no | `true` | Show week selector. |
| `onRangeChange` | `(range) => void` | no | — | Called when the range changes. |
| `timeframeType` | `string` | no | — | Active timeframe type. |
| `onTimeframeTypeChange` | `(type) => void` | no | — | Called when timeframe type changes. |
| `layout` | `"horizontal" \| "vertical"` | no | `"horizontal"` | Layout direction. |

## Minimal example

```tsx
import { TimeframeControls } from "@tetherto/mdk-react-devkit";

<TimeframeControls
  onRangeChange={(range) => console.log(range)}
/>
```
