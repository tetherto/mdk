# AppHeader

A generic three-slot top-bar. The `start`, `children` (middle), and
`actions` slots accept any ReactNode — the component owns no domain.

## When to use

- You're building an app shell with a persistent header.
- You want sticky-to-top behavior without writing layout CSS.
- You'd otherwise hand-roll a `<header>` with flex columns.

## Slots

- **`start`** — left edge. Common: sidebar collapse toggle, brand wordmark.
- **`children`** — middle. Common: dashboard stats strip, page title.
- **`actions`** — right edge. Common: alarms bell, profile menu, sign-out.

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
