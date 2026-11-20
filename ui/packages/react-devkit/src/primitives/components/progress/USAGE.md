# Progress

A thin re-export of `@radix-ui/react-progress`. Use it to render an accessible progress bar.

## Exports

All Radix UI `@radix-ui/react-progress` named exports are re-exported under the `Progress` namespace:

| Name                 | Description                                                |
| -------------------- | ---------------------------------------------------------- |
| `Progress.Root`      | Container element with ARIA `role="progressbar"`           |
| `Progress.Indicator` | Inner element whose transform/width drives the visual fill |

For the full prop reference see the [Radix UI Progress docs](https://www.radix-ui.com/primitives/docs/components/progress).

## Example

```tsx
import { Progress } from "@tetherto/mdk-react-devkit"

<Progress.Root value={60} max={100} className="mdk-progress">
  <Progress.Indicator
    className="mdk-progress__indicator"
    style={{ transform: `translateX(-${100 - 60}%)` }}
  />
</Progress.Root>
```

## Notes

- Style the bar by defining `mdk-progress` and `mdk-progress__indicator` in your SCSS, or use your own class names; the devkit ships no styles for them
- Pass `value={null}` for an indeterminate state
