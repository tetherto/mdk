# HeaderActions

Two top-bar buttons designed to live in the `actions` slot of `<AppHeader>`:
`AlarmsBellButton` and `ProfileMenu`.

## AlarmsBellButton

Renders a bell icon with a three-line severity-stacked count badge
(critical / high / medium). Counts are caller-provided — pair with
`useActiveIncidents` and a small bucketer.

```tsx
import { AlarmsBellButton, useActiveIncidents } from '@tetherto/mdk-react-devkit'

const incidents = useActiveIncidents()
const counts = (incidents.data ?? []).reduce(
  (acc, row) => ({
    ...acc,
    [row.severity]: (acc[row.severity] ?? 0) + 1,
  }),
  { critical: 0, high: 0, medium: 0 },
)

<AlarmsBellButton counts={counts} onClick={() => navigate('/alerts')} />
```

## ProfileMenu

A dropdown wrapping the core `DropdownMenu`. The trigger renders the
user-avatar icon (override via `icon`). The `items` array drives the menu
surface — keep it short.

```tsx
import { ProfileMenu, authStore } from '@tetherto/mdk-react-devkit'

<ProfileMenu
  user={currentUserEmail}
  items={[
    {
      label: 'Sign out',
      onSelect: () => {
        authStore.getState().reset()
        navigate('/signin')
      },
      danger: true,
    },
  ]}
/>
```

## Notes

- Both buttons own their styles in cascade layer `mdk`; consumer overrides
  in `app` win without specificity hacks.
- The bell badge hides itself entirely when all counts are undefined — the
  empty state is the loading state too.
