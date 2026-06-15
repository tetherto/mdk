# Select

Compound Radix-based select with `Select`, `SelectTrigger`, `SelectContent`,
`SelectItem`, `SelectValue`, and `SelectGroup` pieces.

## `Select` props

| Prop          | Type                | Required | Default | Description                            |
| ------------- | ------------------- | -------- | ------- | -------------------------------------- |
| `value`       | `string`            | no       | —       | Controlled value.                      |
| `defaultValue`| `string`            | no       | —       | Uncontrolled initial value.            |
| `onValueChange`| `(v: string) => void` | no    | —       | Setter for the value.                  |
| `allowClear`  | `boolean`           | no       | `false` | Show a clear (X) button when a value is set. |

`SelectTrigger` accepts `size` (`"sm" \| "md" \| "lg"`) and `variant`
(`"default" \| "colored"`).

## Example

```tsx
<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select a container" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="cont-A">Container A</SelectItem>
    <SelectItem value="cont-B">Container B</SelectItem>
  </SelectContent>
</Select>
```
