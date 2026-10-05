# Radio

Accessible radio buttons built on Radix UI `@radix-ui/react-radio-group`. Provides three components: `Radio` (individual item), `RadioGroup` (container), and `RadioCard` (button-style radio).

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

### `Radio` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `value` | Required | `string` | - | Value associated with this option |
| `children` | Optional | `React.ReactNode` | - | Children content (takes precedence over label) |
| `className` | Optional | `string` | - | Custom className for the root element |
| `color` | Optional | `"success" \| "warning" \| "error" \| "primary" \| "default"` | `"primary"` | Color variant when checked |
| `indicatorClassName` | Optional | `string` | - | Custom className for the indicator element |
| `label` | Optional | `string` | - | Label text (or use children for custom content) |
| `radius` | Optional | `"small" \| "none" \| "medium" \| "large" \| "full"` | `"full"` | Border radius variant (full makes it circular) |
| `size` | Optional | `"sm" \| "md" \| "lg"` | `"md"` | Size variant of the radio |

### `RadioCard` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `value` | Required | `string` | - | Value associated with this option |
| `children` | Optional | `React.ReactNode` | - | Children content (takes precedence over label) |
| `className` | Optional | `string` | - | Custom className for the root element |
| `color` | Optional | `"success" \| "warning" \| "error" \| "primary" \| "default"` | `"primary"` | Color variant when checked |
| `indicatorClassName` | Optional | `string` | - | Custom className for the indicator element |
| `label` | Optional | `string` | - | Label text (or use children for custom content) |
| `radius` | Optional | `"small" \| "none" \| "medium" \| "large" \| "full"` | `"full"` | Border radius variant (full makes it circular) |
| `size` | Optional | `"sm" \| "md" \| "lg"` | `"md"` | Size variant of the radio |

### `RadioGroup` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `className` | Optional | `string` | - | Custom className for the group |
| `noGap` | Optional | `boolean` | `false` | Remove gap between radio items |
| `orientation` | Optional | `"horizontal" \| "vertical"` | `"vertical"` | Layout orientation |
<!-- END GENERATED: props -->

## Example

```tsx
import { Radio, RadioCard, RadioGroup } from "@tetherto/mdk-react-devkit"

// Basic radio group
<RadioGroup defaultValue="option1" onValueChange={setValue}>
  <Radio value="option1" label="Option 1" />
  <Radio value="option2" label="Option 2" />
  <Radio value="option3" label="Option 3" disabled />
</RadioGroup>

// Horizontal radio cards (e.g. time range selector)
<RadioGroup
  value={range}
  onValueChange={setRange}
  orientation="horizontal"
  noGap
>
  <RadioCard value="1h" label="1H" />
  <RadioCard value="24h" label="24H" />
  <RadioCard value="7d" label="7D" />
</RadioGroup>
```
