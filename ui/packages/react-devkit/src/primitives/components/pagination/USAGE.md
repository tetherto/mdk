# Pagination

Page navigation control with prev/next, page numbers, first/last jumps and an
optional page-size selector.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `className` | Optional | `string` | - | Custom className for the root element |
| `current` | Optional | `number` | `1` | Current active page number |
| `disabled` | Optional | `boolean` | `false` | Disable pagination |
| `onChange` | Optional | `((page: number, pageSize: number) => void)` | - | Callback when page number or page size changes |
| `onSizeChange` | Optional | `((current: number, size: number) => void)` | - | Callback when page size changes |
| `pageSize` | Optional | `number` | `20` | Number of items per page |
| `pageSizeOptions` | Optional | `number[]` | `[10, 20, 50, 100]` | Page size options for the select dropdown |
| `showSizeChanger` | Optional | `boolean` | `true` | Show page size changer |
| `showTotal` | Optional | `boolean` | `false` | Show total count text |
| `size` | Optional | `"sm" \| "md" \| "lg"` | `"sm"` | Size variant |
| `total` | Optional | `number` | `0` | Total number of items |
<!-- END GENERATED: props -->

## Example

```tsx
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(20);

<Pagination
  total={483}
  current={page}
  pageSize={pageSize}
  showTotal
  onChange={(p, ps) => { setPage(p); setPageSize(ps); }}
/>;
```

## Notes

- For server-side pagination, pass `current`/`total` from your fetch state and
  refetch in `onChange`
- Pair with `DataTable` by reading the table's `pagination` state
