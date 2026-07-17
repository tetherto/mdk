# Skeleton

A pulsing placeholder used to indicate loading content. Supports rectangular and circular shapes.

## Exports

| Name | Description |
| ---- | ----------- |
| `SkeletonBlock` | A single skeleton element with configurable dimensions and border radius |

## `SkeletonBlock` Props

All props are optional.

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `width` | `number \| string` | — | Width in pixels (number) or any CSS value (string) |
| `height` | `number \| string` | — | Height in pixels (number) or any CSS value (string) |
| `borderRadius` | `number \| string` | — | Border radius; ignored when `circle` is true |
| `circle` | `boolean` | `false` | Renders a perfect circle using `height` as the diameter |
| `className` | `string` | — | Additional class for the element |

All other `div` HTML attributes are forwarded.

## Example

```tsx
import { SkeletonBlock } from "@tetherto/mdk-react-devkit"

// Rectangle placeholder
<SkeletonBlock width={200} height={20} />

// Circle avatar placeholder
<SkeletonBlock height={40} circle />

// Custom border radius
<SkeletonBlock width="100%" height={120} borderRadius={8} />
```

## Notes

- Passing a number to `width`, `height`, or `borderRadius` automatically appends `'px'`.
