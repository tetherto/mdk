# PoolDetailsPopover

Trigger button + modal dialog revealing a `PoolDetailsCard`.

## Props

| Prop           | Type               | Required | Default | Description             |
| -------------- | ------------------ | -------- | ------- | ----------------------- |
| `details`      | `PoolDetailItem[]` | yes      | —       | Detail rows.            |
| `triggerLabel` | `string`           | no       | —       | Trigger button label.   |
| `title`        | `string`           | no       | —       | Dialog title.           |
| `description`  | `string`           | no       | —       | Dialog body description.|
| `disabled`     | `boolean`          | no       | `false` | Disable the trigger.    |
| `className`    | `string`           | no       | —       | Additional class names. |

## Example

```tsx
<PoolDetailsPopover triggerLabel="View pool" title="Pool details" details={details} />
```

## Notes

- Uses MDK's `Dialog`; no portal wiring needed.
