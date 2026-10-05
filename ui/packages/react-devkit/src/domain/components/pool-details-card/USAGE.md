# `PoolDetailsCard`

Compact key/value card for pool metadata. Empty list renders a "No data
available" placeholder.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `details` | Required | `PoolDetailItem[]` | - | Detail rows to render |
| `className` | Optional | `string` | - | Additional class names |
| `label` | Optional | `string` | - | Header label |
| `underline` | Optional | `boolean` | `false` | Render an underline under the label |
<!-- END GENERATED: props -->

## Example

```tsx
<PoolDetailsCard
  label="Pool details"
  details={[
    { title: "URL", value: "stratum+tcp://..." },
    { title: "Worker", value: "rig-01" },
  ]}
/>
```

## Data contracts

`PoolDetailItem` is exported alongside the component — `{ title: string;
value?: string | number }`. Undefined values render as `-`.
