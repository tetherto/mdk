# Tag

A small inline label used to display categories, statuses, or metadata. Renders as a `<span>` with a color variant modifier.

## Props

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| `color` | `'dark' \| 'red' \| 'green' \| 'amber' \| 'blue'` | no | `'dark'` | Color variant |
| `children` | `React.ReactNode` | no | — | Tag content |
| `className` | `string` | no | — | Additional class for the root element |

All other `span` HTML attributes are forwarded.

## Example

```tsx
import { Tag } from "@tetherto/mdk-core-ui"

<Tag>Default</Tag>
<Tag color="green">Active</Tag>
<Tag color="red">Error</Tag>
<Tag color="amber">Warning</Tag>
<Tag color="blue">Info</Tag>
```
