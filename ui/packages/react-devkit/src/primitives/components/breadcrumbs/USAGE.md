# Breadcrumbs

Horizontal breadcrumb navigation. Renders an ordered trail of links / buttons /
plain labels with an optional "Back" button on the left.

## Props

| Prop            | Type                | Required | Default | Description                                            |
| --------------- | ------------------- | -------- | ------- | ------------------------------------------------------ |
| `items`         | `BreadcrumbItem[]`  | yes      | —       | Ordered trail; the last item is rendered as current.   |
| `showBack`      | `boolean`           | no       | `false` | Show a leading "Back" button.                          |
| `backLabel`     | `string`            | no       | `"Back"` | Label for the back button.                            |
| `onBackClick`   | `VoidFunction`      | no       | —       | Callback fired when the back button is clicked.        |
| `separator`     | `ReactNode`         | no       | `"/"`   | Custom separator between items.                        |
| `className`     | `string`            | no       | —       | Root class names.                                      |
| `itemClassName` | `string`            | no       | —       | Class names applied to each item.                      |
| `backClassName` | `string`            | no       | —       | Class names applied to the back button.                |

### `BreadcrumbItem`

```ts
type BreadcrumbItem = {
  label: string;
  href?: string;       // renders as <a>
  onClick?: VoidFunction; // renders as <button>
};
```

## Example

```tsx
<Breadcrumbs
  showBack
  onBackClick={() => navigate(-1)}
  items={[
    { label: "Dashboard", href: "/" },
    { label: "Devices", onClick: () => navigate("/devices") },
    { label: "Miner #42" },
  ]}
/>
```

## Notes

- The last item is rendered as the current page (`aria-current="page"`).
- Items without `href` or `onClick` render as plain text.
