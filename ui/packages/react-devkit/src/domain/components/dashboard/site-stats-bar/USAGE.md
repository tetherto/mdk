# SiteStatsBar

Site-level summary strip sitting at the top of a dashboard page. Composes
`WidgetTopRow` (title + current power) and `GenericDataBox` (hashrate, miner
count, container count) into one horizontal card.

## Props

| Prop             | Type      | Required | Default  | Description                                       |
| ---------------- | --------- | -------- | -------- | ------------------------------------------------- |
| `title`          | `string`  | yes      | —        | Site label, rendered in the header row.           |
| `power`          | `number`  | no       | —        | Current power, expressed in `powerUnit`.          |
| `powerUnit`      | `string`  | no       | `'kW'`   | Display unit for `power`.                         |
| `totalHashrate`  | `number`  | no       | —        | Aggregate hashrate.                               |
| `hashrateUnit`   | `string`  | no       | `'TH/s'` | Display unit for `totalHashrate`.                 |
| `minerCount`     | `number`  | no       | —        | Total miner count across the site.                |
| `containerCount` | `number`  | no       | —        | Total container count across the site.            |
| `isLoading`      | `boolean` | no       | `false`  | Render a skeleton bar while data is loading.      |
| `className`      | `string`  | no       | —        | Optional class hook.                              |

## Example

```tsx
<SiteStatsBar
  title='Site A'
  power={1320}
  totalHashrate={92.3}
  minerCount={1024}
  containerCount={4}
/>
```

## Notes

- Renders `'—'` for any stat that's `undefined`. Pass `isLoading` for a
  cleaner first-paint experience.
- `WidgetTopRow` reads timezone formatting via `useTimezoneFormatter`, so this
  component must live inside an `<MdkProvider>` tree.
