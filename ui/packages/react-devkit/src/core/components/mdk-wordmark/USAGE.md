# MdkWordmark

The canonical MDK brand lockup, rendered as inline SVG so it tints to
`currentColor`. Use it in `<AppHeader>` via the `logo` slot, on
sign-in pages, or anywhere else the brand should appear.

## When to use

- You need the MDK lockup at a known size (sm / md / lg).
- The surrounding text color or design token should drive the brand color
  via `currentColor`.

## Props

- **`size`** — `"sm" | "md" | "lg"`. Defaults to `"md"`.
- **`title`** — accessible label. Defaults to `"MDK"`.
- **`className`** — class hook on the outer `<svg>`.

## Example

```tsx
import { MdkWordmark } from "@tetherto/mdk-react-devkit/core";

<MdkWordmark size="md" />;
```
