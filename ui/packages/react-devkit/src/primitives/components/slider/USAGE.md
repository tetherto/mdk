# Slider

A thin re-export of `@radix-ui/react-slider`. Use it to render an accessible range slider.

## Exports

The devkit exports the Radix UI `@radix-ui/react-slider` parts as-is under the `Slider` namespace:

| Name           | Description                                 |
| -------------- | ------------------------------------------- |
| `Slider.Root`  | Slider container with ARIA attributes       |
| `Slider.Track` | The slider rail                             |
| `Slider.Range` | The filled portion of the track             |
| `Slider.Thumb` | The draggable handle; renders one per value |

The parts ship unstyled. Give each one its devkit class to pick up the default look:

| Part           | Class               | Default look                                                   |
| -------------- | ------------------- | -------------------------------------------------------------- |
| `Slider.Root`  | `mdk-slider`        | Full width of its container, 20px tall; dimmed when `disabled` |
| `Slider.Track` | `mdk-slider__track` | 4px rounded rail                                               |
| `Slider.Range` | `mdk-slider__range` | Primary color fill                                             |
| `Slider.Thumb` | `mdk-slider__thumb` | 16px primary color circle with a focus ring                    |

Vertical sliders (`orientation="vertical"`) take the same classes; the root then fills its container's height.

For the full prop reference see the [Radix UI Slider docs](https://www.radix-ui.com/primitives/docs/components/slider).

## Example

```tsx
import { Slider } from "@tetherto/mdk-react-devkit"

const [value, setValue] = useState([50])

<Slider.Root
  value={value}
  onValueChange={setValue}
  min={0}
  max={100}
  step={1}
  className="mdk-slider"
>
  <Slider.Track className="mdk-slider__track">
    <Slider.Range className="mdk-slider__range" />
  </Slider.Track>
  <Slider.Thumb className="mdk-slider__thumb" aria-label="Volume" />
</Slider.Root>
```

A range slider renders one `Slider.Thumb` per value, for example `value={[20, 80]}` with two thumbs.
