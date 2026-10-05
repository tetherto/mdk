# `AppHeader`

A generic three-slot top-bar. The `start`, `children` (middle), and
`actions` slots accept any ReactNode — the component owns no domain.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `actions` | Optional | `React.ReactNode` | - | Right-edge action cluster — e.g. alarms bell, profile menu, or sign-out |
| `children` | Optional | `React.ReactNode` | - | Middle slot — e.g. the dashboard stats strip or page title |
| `className` | Optional | `string` | - | Optional class hook for the outer `<header>` element |
| `logo` | Optional | `React.ReactNode` | - | Left-most slot — typically the app's brand lockup / logo |
| `start` | Optional | `React.ReactNode` | - | Left-edge content — e.g. a sidebar collapse toggle or brand wordmark |
| `sticky` | Optional | `boolean` | `true` | Render the header sticky to the top of its scroll container |
<!-- END GENERATED: props -->

## When to use

- You're building an app shell with a persistent header.
- You want sticky-to-top behavior without writing layout CSS.
- You'd otherwise hand-roll a `<header>` with flex columns.

## Example

```tsx
import { AppHeader, AlarmsBellButton, ProfileMenu } from '@tetherto/mdk-react-devkit'

<AppHeader
  start={<button onClick={toggleSidebar}>≡</button>}
  actions={
    <>
      <AlarmsBellButton counts={{ critical: 2 }} />
      <ProfileMenu items={[{ label: 'Sign out', onSelect: signOut, danger: true }]} />
    </>
  }
>
  <HeaderStatsBar>…</HeaderStatsBar>
</AppHeader>
```

## Notes

- Sticky positioning is on by default. Pass `sticky={false}` to disable.
- The component sets `position: sticky; top: 0`; the outer scroll container
  must be a scrollable ancestor for the sticky behavior to engage.
