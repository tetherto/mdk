# `CurrencyToggler`

A segmented button control for switching between currency options. Each item can be a plain string or a `CurrencyItem` object with an optional custom label and disabled state.
A disabled item can carry a `disabledReason`, shown in a tooltip when the item is hovered or focused.

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
| `disabledReason` | Optional | `string` | - | Why the option is disabled, shown in a tooltip on hover and focus. The option is then marked `aria-disabled` instead of `disabled`, so it still receives pointer and focus events |
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

// Disabled item that says why
<CurrencyToggler
  currencies={[
    { value: "USD", label: "USD" },
    { value: "BTC", label: "BTC", disabled: true, disabledReason: "No BTC prices for this site yet" },
  ]}
  value={currency}
  onChange={setCurrency}
/>
```

## Notes

- An item with `disabled` alone is a native `disabled` button, so it gets no hover, focus or tooltip
- An item with `disabled` and `disabledReason` is `aria-disabled` instead. It stays hoverable and focusable so the
  tooltip can show, and clicks on it don't call `onChange`.
- Unselected options are `--mdk-color-text-muted` and the selected one is the primary color. A disabled option is
  `--mdk-color-white-12` on the toggler's surface
- The toggler is `--mdk-control-height` tall, the same as `Select` and the secondary `Button`, so it lines up beside
  them in a filter bar; the buttons fill that height inside the toggler's padding and border
