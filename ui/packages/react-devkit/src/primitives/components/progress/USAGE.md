# Progress

A thin re-export of `@radix-ui/react-progress`. Use it to render an accessible progress bar.

## Exports

All Radix UI `@radix-ui/react-progress` named exports are re-exported as-is:

| Name | Description |
| ---- | ----------- |
| `Root` | Container element with ARIA `role="progressbar"` |
| `Indicator` | Inner element whose transform/width drives the visual fill |

For the full prop reference see the [Radix UI Progress docs](https://www.radix-ui.com/primitives/docs/components/progress).

## Example

```tsx
import * as Progress from "@tetherto/mdk-react-devkit/progress"
// or named imports:
import { Root as ProgressRoot, Indicator as ProgressIndicator } from "@tetherto/mdk-react-devkit"

<ProgressRoot value={60} max={100} className="mdk-progress">
  <ProgressIndicator
    className="mdk-progress__indicator"
    style={{ transform: `translateX(-${100 - 60}%)` }}
  />
</ProgressRoot>
```

## Notes

- Style the bar by overriding `mdk-progress` and `mdk-progress__indicator` in your SCSS, or add your own class names.
- Pass `value={null}` for an indeterminate state.
