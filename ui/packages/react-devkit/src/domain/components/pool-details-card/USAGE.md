# PoolDetailsCard

Compact key/value card for pool metadata. Empty list renders a "No data
available" placeholder.

## Props

| Prop        | Type               | Required | Default | Description                          |
| ----------- | ------------------ | -------- | ------- | ------------------------------------ |
| `details`   | `PoolDetailItem[]` | yes      | —       | Detail rows to render.               |
| `label`     | `string`           | no       | —       | Header label.                        |
| `underline` | `boolean`          | no       | `false` | Render an underline under the label. |
| `className` | `string`           | no       | —       | Additional class names.              |

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
