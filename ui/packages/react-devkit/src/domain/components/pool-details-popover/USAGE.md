# `PoolDetailsPopover`

Trigger button + modal dialog revealing a `PoolDetailsCard`.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `details` | Required | `PoolDetailItem[]` | - | Detail rows |
| `className` | Optional | `string` | - | Additional class names |
| `description` | Optional | `string` | - | Dialog body description |
| `disabled` | Optional | `boolean` | `false` | Disable the trigger |
| `title` | Optional | `string` | - | Dialog title |
| `triggerLabel` | Optional | `string` | - | Trigger button label |
<!-- END GENERATED: props -->

## Example

```tsx
<PoolDetailsPopover triggerLabel="View pool" title="Pool details" details={details} />
```

## Notes

- Uses MDK's `Dialog`; no portal wiring needed
