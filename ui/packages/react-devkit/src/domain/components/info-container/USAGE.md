# InfoContainer / DeviceInfo

Labeled key/value containers. `InfoContainer` renders a single labeled row;
`DeviceInfo` renders a list of them from a single `data` array.

## `InfoContainer` Props detail

| Prop    | Status   | Type     | Default | Description |
| ------- | -------- | -------- | ------- | ----------- |
| `title` | Optional | `string` | —       | Row label   |
| `value` | Optional | `string \| string[] \| number` | — | Row value (arrays render multi-line) |

## `DeviceInfo` Props detail

| Prop   | Status   | Type         | Default | Description    |
| ------ | -------- | ------------ | ------- | -------------- |
| `data` | Optional | `InfoItem[]` | —       | Rows to render |

## Example

```tsx
<InfoContainer title="Worker" value="rig-01" />
<DeviceInfo data={[
  { title: "MAC", value: "AA:BB:CC:00:00:01" },
  { title: "IP", value: "10.0.0.11" },
]} />
```
