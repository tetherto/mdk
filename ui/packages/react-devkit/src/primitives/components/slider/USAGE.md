# Slider

A thin re-export of `@radix-ui/react-slider`. Use it to render an accessible range slider.

## Exports

All Radix UI `@radix-ui/react-slider` named exports are re-exported as-is:

| Name | Description |
| ---- | ----------- |
| `Root` | Slider container with ARIA attributes |
| `Track` | The slider rail |
| `Range` | The filled portion of the track |
| `Thumb` | The draggable handle; renders one per value |

For the full prop reference see the [Radix UI Slider docs](https://www.radix-ui.com/primitives/docs/components/slider).

## Example

```tsx
import { Root as Slider, Track, Range, Thumb } from "@tetherto/mdk-react-devkit"

const [value, setValue] = useState([50])

<Slider
  value={value}
  onValueChange={setValue}
  min={0}
  max={100}
  step={1}
  className="mdk-slider"
>
  <Track className="mdk-slider__track">
    <Range className="mdk-slider__range" />
  </Track>
  <Thumb className="mdk-slider__thumb" aria-label="Volume" />
</Slider>
```
