# DataLabel

Read-only period range label (`PERIOD: start - end`). Dates are formatted as
`dd/MM/yy` in the timezone from `useTimezone` (`@tetherto/mdk-react-adapter`).
Invalid or missing dates render as `--/--/--`.

## Props

| Prop        | Type           | Required | Default    | Description                   |
| ----------- | -------------- | -------- | ---------- | ----------------------------- |
| `startDate` | `Date \| null` | no       | —          | Range start.                  |
| `endDate`   | `Date \| null` | no       | —          | Range end.                    |
| `label`     | `string`       | no       | `"PERIOD"` | Header text before the colon. |

## Example

```tsx
const start = new Date(2025, 0, 6)
const end = new Date(2025, 2, 15)

;<DataLabel startDate={start} endDate={end} />
```

## Notes

- Wrap your app in `<MdkProvider>` so the timezone store is available.
- Styling uses the `mdk-data-label` BEM block; no size or color variants.
- Use a dark toolbar background so default light text remains readable.
