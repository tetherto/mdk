# `CurrencyToggler`

A segmented button control for switching between currency options. Each item can be a plain string or a `CurrencyItem` object with an optional custom label and disabled state.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `currencies` | Required | `(string \| CurrencyItem)[]` | - | List of currency options |
| `onChange` | Required | `(currency: string) => void` | - | Fired with the selected currency value when a button is clicked |
| `value` | Required | `string` | - | Currently selected currency value |
| `className` | Optional | `string` | - | Additional class for the root element |
| `fullWidth` | Optional | `boolean` | `false` | Stretch to the container's width, the options sharing it evenly (a tab bar) |
| `itemAriaLabel` | Optional | `((label: string) => string)` | - | Each button's accessible name, from its label. Defaults to "Select <label> currency"; pass your own when the options are not currencies |

### `CurrencyItem`

| Field | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `value` | Required | `string` | - | Option value (used for selection) |
| `disabled` | Optional | `boolean` | - | Disables this option |
| `label` | Optional | `string` | - | Display label (defaults to `value`) |
<!-- END GENERATED: props -->

## Example

```tsx
import { CurrencyToggler } from "@tetherto/mdk-react-devkit"

const [currency, setCurrency] = useState("USD")

// Simple string array
<CurrencyToggler
  currencies={["USD", "BTC", "ETH"]}
  value={currency}
  onChange={setCurrency}
/>

// Object array with disabled item
<CurrencyToggler
  currencies={[
    { value: "USD", label: "USD" },
    { value: "BTC", label: "BTC", disabled: true },
  ]}
  value={currency}
  onChange={setCurrency}
/>
```
