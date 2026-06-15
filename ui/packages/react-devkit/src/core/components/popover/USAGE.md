# Popover

Floating panel anchored to a trigger element. Built on Radix UI; use the
composable parts for full control, or `SimplePopover` for the common case.

## Composition

```tsx
<Popover>
  <PopoverTrigger asChild><Button>Open</Button></PopoverTrigger>
  <PopoverContent side="bottom" align="start" showArrow showClose>
    <p>Hello!</p>
  </PopoverContent>
</Popover>
```

## `Popover` (root) props

| Prop           | Type                  | Required | Default | Description                  |
| -------------- | --------------------- | -------- | ------- | ---------------------------- |
| `open`         | `boolean`             | no       | —       | Controlled open state.       |
| `defaultOpen`  | `boolean`             | no       | `false` | Uncontrolled initial state.  |
| `onOpenChange` | `(open: boolean) => void` | no   | —       | Open-state change handler.   |
| `modal`        | `boolean`             | no       | `false` | Trap focus inside the panel. |

## `PopoverContent` props

| Prop          | Type                                    | Required | Default     | Description                              |
| ------------- | --------------------------------------- | -------- | ----------- | ---------------------------------------- |
| `side`        | `"top" \| "right" \| "bottom" \| "left"` | no       | `"bottom"`  | Side relative to the trigger.            |
| `align`       | `"start" \| "center" \| "end"`           | no       | `"center"`  | Alignment along the side.                |
| `sideOffset`  | `number`                                | no       | `8`         | Distance from the trigger (px).          |
| `showArrow`   | `boolean`                               | no       | `false`     | Render a directional arrow.              |
| `showClose`   | `boolean`                               | no       | `false`     | Render a close (×) button.               |
| `className`   | `string`                                | no       | —           | Content class names.                     |

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

- `PopoverContent` automatically portals to `document.body`.
- For tooltips that appear on hover, use `<Tooltip>` instead.
