# Skeleton

A pulsing placeholder used to indicate loading content. Supports rectangular and circular shapes.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `borderRadius` | Optional | `string \| number` | - | Border radius; ignored when `circle` is true |
| `circle` | Optional | `boolean` | `false` | Renders a perfect circle using `height` as the diameter |
| `className` | Optional | `string` | - | Additional class for the element |
| `height` | Optional | `string \| number` | - | Height in pixels (number) or any CSS value (string) |
| `width` | Optional | `string \| number` | - | Width in pixels (number) or any CSS value (string) |
<!-- END GENERATED: props -->

## Exports

| Name            | Description |
| --------------- | ----------- |
| `SkeletonBlock` | A single skeleton element with configurable dimensions and border radius |

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

- Passing a number to `width`, `height`, or `borderRadius` automatically appends `'px'`
