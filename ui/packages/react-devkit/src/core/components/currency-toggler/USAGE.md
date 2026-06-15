# CurrencyToggler

A segmented button control for switching between currency options. Each item can be a plain string or a `CurrencyItem` object with an optional custom label and disabled state.

## Props

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `currencies` | `(string \| CurrencyItem)[]` | yes | — | List of currency options |
| `value` | `string` | yes | — | Currently selected currency value |
| `onChange` | `(currency: string) => void` | yes | — | Fired with the selected currency value when a button is clicked |
| `className` | `string` | no | — | Additional class for the root element |

### `CurrencyItem`

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `value` | `string` | yes | Option value (used for selection) |
| `label` | `string` | no | Display label (defaults to `value`) |
| `disabled` | `boolean` | no | Disables this option |

## Example

```tsx
import { CurrencyToggler } from "@tetherto/mdk-core-ui"

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
