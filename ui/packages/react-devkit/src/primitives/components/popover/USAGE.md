# Popover

Floating panel anchored to a trigger element. Built on Radix UI; use the
composable parts for full control, or `SimplePopover` for the common case.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `content` | Required | `React.ReactNode` | - | Popover content |
| `trigger` | Required | `React.ReactNode` | - | Element that triggers the popover |
| `align` | Optional | `"center" \| "start" \| "end"` | `"center"` | Alignment of the popover |
| `className` | Optional | `string` | - | Additional class for content |
| `onOpenChange` | Optional | `((open: boolean) => void)` | - | Callback when open state changes |
| `open` | Optional | `boolean` | - | Controlled open state |
| `showArrow` | Optional | `boolean` | `false` | Whether to show the arrow |
| `showClose` | Optional | `boolean` | `false` | Whether to show a close button |
| `side` | Optional | `"left" \| "right" \| "top" \| "bottom"` | `"bottom"` | Position of the popover relative to trigger |
| `sideOffset` | Optional | `number` | `8` | Distance from the trigger in pixels |
<!-- END GENERATED: props -->

## Composition

```tsx
<Popover>
  <PopoverTrigger asChild><Button>Open</Button></PopoverTrigger>
  <PopoverContent side="bottom" align="start" showArrow showClose>
    <p>Hello!</p>
  </PopoverContent>
</Popover>
```

## `Popover` (root) Props detail

> **Props are generated from this component's TypeScript types, the source of truth.** The following are supplementary (object-prop shapes, allowed values, or passthrough props), not the full prop list.

| Prop           | Status   | Type      | Default | Description                 |
| -------------- | -------- | --------- | ------- | --------------------------- |
| `open`         | Optional | `boolean` | —       | Controlled open state       |
| `defaultOpen`  | Optional | `boolean` | `false` | Uncontrolled initial state  |
| `onOpenChange` | Optional | `(open: boolean) => void` | —       | Open-state change handler   |
| `modal`        | Optional | `boolean` | `false` | Trap focus inside the panel |

## `PopoverContent` Props detail

| Prop         | Status   | Type                                     | Default    | Description                    |
| ------------ | -------- | ---------------------------------------- | ---------- | ------------------------------ |
| `side`       | Optional | `"top" \| "right" \| "bottom" \| "left"` | `"bottom"` | Side relative to the trigger   |
| `align`      | Optional | `"start" \| "center" \| "end"`           | `"center"` | Alignment along the side       |
| `sideOffset` | Optional | `number`                                 | `8`        | Distance from the trigger (px) |
| `showArrow`  | Optional | `boolean`                                | `false`    | Render a directional arrow     |
| `showClose`  | Optional | `boolean`                                | `false`    | Render a close (×) button      |
| `className`  | Optional | `string`                                 | —          | Content class names            |

## Example

```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button>Filters</Button>
  </PopoverTrigger>
  <PopoverContent side="bottom" align="end" showArrow>
    <FilterForm />
  </PopoverContent>
</Popover>
```

For the common trigger-plus-panel case, prefer `SimplePopover`:

```tsx
<SimplePopover trigger={<Button>Open</Button>} content={<p>Hello</p>} />
```

## Notes

- `PopoverContent` automatically portals to `document.body`
- For tooltips that appear on hover, use `<Tooltip>` instead
