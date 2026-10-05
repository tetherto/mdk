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
<!-- END GENERATED: props -->

## Props detail

> **Props are generated from this component's TypeScript types, the source of truth.** The following are supplementary (object-prop shapes, allowed values, or passthrough props), not the full prop list.

### `CurrencyItem`

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `value` | `string` | yes | Option value (used for selection) |
| `label` | `string` | no | Display label (defaults to `value`) |
| `disabled` | `boolean` | no | Disables this option |

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
