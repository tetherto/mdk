# InfoContainer / DeviceInfo

Labeled key/value containers. `InfoContainer` renders a single labeled row;
`DeviceInfo` renders a list of them from a single `data` array.

## `InfoContainer` props

| Prop    | Type                          | Required | Default | Description                            |
| ------- | ----------------------------- | -------- | ------- | -------------------------------------- |
| `title` | `string`                      | no       | —       | Row label.                             |
| `value` | `string \| string[] \| number` | no      | —       | Row value (arrays render multi-line).  |

## `DeviceInfo` props

| Prop   | Type         | Required | Default | Description       |
| ------ | ------------ | -------- | ------- | ----------------- |
| `data` | `InfoItem[]` | no       | —       | Rows to render.   |

## Example

```tsx
<InfoContainer title="Worker" value="rig-01" />
<DeviceInfo data={[
  { title: "MAC", value: "AA:BB:CC:00:00:01" },
  { title: "IP", value: "10.0.0.11" },
]} />
```
