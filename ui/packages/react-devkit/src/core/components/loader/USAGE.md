# Loader

A pulsing dots loading animation. Use it as an inline loading indicator or inside chart/card overlay slots.

## Props

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `size` | `number` | no | `10` | Diameter of each dot in pixels |
| `count` | `3 \| 5 \| 7` | no | `5` | Number of dots |
| `color` | `'red' \| 'gray' \| 'blue' \| 'amber' \| 'orange'` | no | `'orange'` | Dot color variant |
| `className` | `string` | no | — | Additional class for the root element |

All other `div` HTML attributes are forwarded.

## Example

```tsx
import { Loader } from "@tetherto/mdk-core-ui"

// Default
<Loader />

// Smaller with fewer dots
<Loader size={8} count={3} color="blue" />
```
