# Tooltip

Hover-triggered floating label built on Radix UI. Two ways to use it:

- **`SimpleTooltip`** — one-prop wrapper, recommended for most cases.
- **`Tooltip` + sub-parts** — full composition for advanced control.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `children` | Required | `React.ReactNode` | - | Element that triggers the tooltip |
| `content` | Required | `React.ReactNode` | - | Tooltip content (string or JSX) |
| `className` | Optional | `string` | - | Additional class for content |
| `delayDuration` | Optional | `number` | `200` | Delay before showing tooltip (ms) |
| `showArrow` | Optional | `boolean` | `true` | Whether to show the arrow |
| `side` | Optional | `"left" \| "right" \| "top" \| "bottom"` | `"top"` | Position of the tooltip relative to trigger |
| `sideOffset` | Optional | `number` | `8` | Distance from the trigger in pixels |
<!-- END GENERATED: props -->

## Composable parts

```tsx
<TooltipProvider delayDuration={200}>
  <Tooltip>
    <TooltipTrigger asChild><InfoIcon /></TooltipTrigger>
    <TooltipContent side="right">Helpful explanation</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

## Example

```tsx
<SimpleTooltip content="Refresh data" side="bottom">
  <Button icon={<ReloadIcon />} aria-label="Refresh" />
</SimpleTooltip>
```

## Notes

- For click-triggered panels, use `Popover` instead
- If `content` is empty/null, `SimpleTooltip` renders the trigger unwrapped
- Wrap your app in a single `<TooltipProvider>` when you have many tooltips
  to share the open/close timing logic
