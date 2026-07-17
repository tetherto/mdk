# LabeledCard

A generic card container with a header label, optional navigation link, and configurable layout modifiers.

## Props

All props are optional.

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `label` | `React.ReactNode` | — | Header content shown above the card body |
| `isDark` | `boolean` | `false` | Applies a dark background modifier |
| `isFullWidth` | `boolean` | `false` | Stretches the card to full container width |
| `isFullHeight` | `boolean` | `false` | Stretches the card to full container height |
| `isRelative` | `boolean` | `false` | Sets `position: relative` on the container |
| `isScrollable` | `boolean` | `false` | Enables vertical scroll on the card body |
| `hasNoWrap` | `boolean` | `false` | Prevents content from wrapping |
| `hasNoMargin` | `boolean` | `false` | Removes default margin |
| `hasNoBorder` | `boolean` | `false` | Removes the card border |
| `children` | `React.ReactNode` | — | Card body content |
| `className` | `string` | — | Additional class for the root element |
| `getNavigateOptions` | `(label: string) => { href?: string; target?: string }` | — | Returns a link `href`/`target` for the label when provided |

## Example

```tsx
import { LabeledCard } from "@tetherto/mdk-react-devkit"

<LabeledCard label="Device Overview" isFullWidth>
  <p>Content goes here.</p>
</LabeledCard>

// With a navigation link on the label
<LabeledCard
  label="Miners with error"
  getNavigateOptions={(label) => ({ href: "/miners?filter=error" })}
>
  <MinerList />
</LabeledCard>
```

## Notes

- If `label` is the string `'Miners with error'`, the label automatically receives an informational tooltip explaining that minor errors not affecting hashrate are excluded.
- `getNavigateOptions` only activates when `label` is a plain string.
