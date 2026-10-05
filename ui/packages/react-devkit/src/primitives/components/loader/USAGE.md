# Loader

A pulsing dots loading animation. Use it as an inline loading indicator or inside chart/card overlay slots.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `className` | Optional | `string` | - | Custom className for the root element |
| `color` | Optional | `"red" \| "gray" \| "blue" \| "amber" \| "orange"` | `"orange"` | Color variant of the loader |
| `count` | Optional | `3 \| 5 \| 7` | `5` | Number of dots to display |
| `inline` | Optional | `boolean` | `false` | Render as an inline activity indicator instead of a block loading state. The default reserves a fixed 200px so a panel standing in for absent content does not collapse and then jump. Inline, that height is wrong: it strands the dots ~100px below the thing they belong to and centers them against surrounding text, which reads as frozen |
| `size` | Optional | `number` | `10` | Size of each dot in pixels |
<!-- END GENERATED: props -->

## Block or inline — pick deliberately

The default is a **block** loading state: a fixed 200px tall box with the dots centered, so a
panel standing in for content that has not arrived does not collapse and then jump when it
does. That is what every `isLoading ? <Loader /> : …` call site wants.

**Pass `inline` for an indicator inside a flow of content** — a chat transcript, a row, next to
a label. Without it the 200px applies there too, stranding the dots ~100px below the thing they
belong to and centring them against left-aligned text, which reads as a frozen UI rather than a
working one.

## Example

```tsx
import { Loader } from "@tetherto/mdk-react-devkit"

// Block: standing in for content that has not arrived
<Loader />

// Smaller with fewer dots
<Loader size={8} count={3} color="blue" />

// Inline: something is happening, in place
<Loader inline size={6} count={3} />
```
