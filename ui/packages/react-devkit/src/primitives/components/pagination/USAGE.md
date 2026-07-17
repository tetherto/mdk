# Pagination

Page navigation control with prev/next, page numbers, first/last jumps and an
optional page-size selector.

## Props

| Prop              | Type                                     | Required | Default               | Description                                  |
| ----------------- | ---------------------------------------- | -------- | --------------------- | -------------------------------------------- |
| `current`         | `number`                                 | no       | `1`                   | Current 1-indexed page number.               |
| `total`           | `number`                                 | no       | `0`                   | Total number of items across all pages.      |
| `pageSize`        | `number`                                 | no       | `20`                  | Items per page.                              |
| `pageSizeOptions` | `number[]`                               | no       | `[10, 20, 50, 100]`   | Selectable page sizes.                       |
| `showSizeChanger` | `boolean`                                | no       | `true`                | Show the page-size dropdown.                 |
| `showTotal`       | `boolean`                                | no       | `false`               | Show `"N items"` text on the left.           |
| `disabled`        | `boolean`                                | no       | `false`               | Disable all controls.                        |
| `size`            | `ComponentSize`                          | no       | `"sm"`                | Size variant.                                |
| `onChange`        | `(page: number, pageSize: number) => void` | no     | —                     | Fired when page or page size changes.        |

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
  refetch in `onChange`.
- Pair with `DataTable` by reading the table's `pagination` state.
