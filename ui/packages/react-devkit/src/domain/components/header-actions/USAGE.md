# `HeaderActions`

Top-bar buttons designed to live in the `actions` slot of `<AppHeader>`:
`PendingActionsButton`, `AlarmsBellButton`, and `ProfileMenu`.

<!-- BEGIN GENERATED: props — do not edit; npm run generate:usage-proptables (source: component JSDoc/types via registry.json) -->
## Props

### `AlarmsBellButton` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `className` | Optional | `string` | - | Additional class names |
| `counts` | Optional | `AlarmsBellButtonCounts` | `{}` | Severity-bucketed alarm counts rendered in the stacked badge |
| `label` | Optional | `string` | `"Active alarms"` | Accessible label. Defaults to "Active alarms" |
| `onClick` | Optional | `((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void)` | - | Click handler — typically opens an alerts panel or routes to /alerts |
| `onSeverityClick` | Optional | `((severity: AlarmSeverity, event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void)` | - | Click handler for an individual severity count. When provided, each badge row becomes its own button so an operator can jump straight to the alerts page filtered by that severity (e.g. `/alerts?severity=critical`). When omitted, the counts render as plain (non-interactive) text |

### `PendingActionsButton` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `className` | Optional | `string` | - | Additional class names |
| `onClick` | Optional | `((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void)` | `toggles the actions sidebar` | Click handler override — defaults to toggling the actionsStore sidebar |

### `ProfileMenu` props

| Prop | Status | Type / Options | Default | Description |
|------|--------|----------------|---------|-------------|
| `items` | Required | `ProfileMenuItem[]` | - | Items rendered in the dropdown, top-to-bottom |
| `className` | Optional | `string` | - | Additional class names |
| `icon` | Optional | `React.ReactNode` | `<UserAvatarIcon />` | Override the trigger icon — defaults to the user-avatar icon |
| `label` | Optional | `string` | `"Profile menu"` | Accessible label for the trigger button |
| `user` | Optional | `React.ReactNode` | - | Optional user label rendered at the top of the dropdown (e.g. an email) |
<!-- END GENERATED: props -->

## `PendingActionsButton`

A header tile showing the total count of pending actions (local drafts +
submitted voting actions + others' requests, clamped to `99+`). Clicking it
opens the global `ActionsSidebar` via the shared `actionsStore` toggle, so the
two only need to be mounted in the same app — no props are required.

It reads `actionsStore` and `useLiveActions` internally, so it must be rendered
under `MdkProvider` (QueryClient + auth). Mount the `ActionsSidebar` once at the
app root for the button to open.

```tsx
import { PendingActionsButton, ActionsSidebar } from '@tetherto/mdk-react-devkit'

// In the header toolbar:
<PendingActionsButton />

// Once at the app root (e.g. beside the content outlet):
<ActionsSidebar />
```

Pass `onClick` to override the default open-sidebar behaviour (e.g. to navigate
to a dedicated review route instead):

```tsx
<PendingActionsButton onClick={() => navigate('/pool-manager?review=1')} />
```

## `AlarmsBellButton`

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

## `ProfileMenu`

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
  in `app` win without specificity hacks
- The bell badge hides itself entirely when all counts are undefined — the
  empty state is the loading state too
