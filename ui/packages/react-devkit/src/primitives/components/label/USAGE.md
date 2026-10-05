# Label

Accessible `<label>` element for form fields. Built on Radix UI Label so that
clicks anywhere on the label focus the associated input.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `htmlFor` | Optional | `string` | - | Id of the input being labelled |
<!-- END GENERATED: props -->

## Example

```tsx
<Label htmlFor="email">Email</Label>
<Input id="email" type="email" />
```

## Notes

- Pair with `Input`, `Select`, `Checkbox`, `Switch`, etc. via `htmlFor`
- Inside an MDK `<Form>` use `<FormLabel>` instead — it auto-links to the field
