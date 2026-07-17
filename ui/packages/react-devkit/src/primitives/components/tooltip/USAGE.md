# Tooltip

Hover-triggered floating label built on Radix UI. Two ways to use it:

- **`SimpleTooltip`** — one-prop wrapper, recommended for most cases.
- **`Tooltip` + sub-parts** — full composition for advanced control.

## `SimpleTooltip` props

| Prop            | Type        | Required | Default | Description                              |
| --------------- | ----------- | -------- | ------- | ---------------------------------------- |
| `content`       | `ReactNode` | yes      | —       | Tooltip body (string or JSX).            |
| `children`      | `ReactNode` | yes      | —       | Trigger element (any focusable node).    |
| `side`          | `"top" \| "right" \| "bottom" \| "left"` | no | `"top"` | Side relative to trigger.  |
| `sideOffset`    | `number`    | no       | `8`     | Distance from the trigger (px).          |
| `delayDuration` | `number`    | no       | `200`   | Hover delay before showing (ms).         |
| `showArrow`     | `boolean`   | no       | `true`  | Render a directional arrow.              |
| `className`     | `string`    | no       | —       | Content class names.                     |

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

- For click-triggered panels, use `Popover` instead.
- If `content` is empty/null, `SimpleTooltip` renders the trigger unwrapped.
- Wrap your app in a single `<TooltipProvider>` when you have many tooltips
  to share the open/close timing logic.
