# Breadcrumbs

Horizontal breadcrumb navigation. Renders an ordered trail of links / buttons /
plain labels with an optional "Back" button on the left.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `items` | Required | `BreadcrumbItem[]` | - | Ordered trail; the last item is rendered as current |
| `backClassName` | Optional | `string` | - | Class names applied to the back button |
| `backLabel` | Optional | `string` | `"Back"` | Label for the back button |
| `className` | Optional | `string` | - | Root class names |
| `itemClassName` | Optional | `string` | - | Class names applied to each item |
| `onBackClick` | Optional | `VoidFunction` | - | Callback fired when the back button is clicked |
| `separator` | Optional | `React.ReactNode` | `"/"` | Custom separator between items |
| `showBack` | Optional | `boolean` | `false` | Show a leading "Back" button |
<!-- END GENERATED: props -->

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

- The last item is rendered as the current page (`aria-current="page"`)
- Items without `href` or `onClick` render as plain text
