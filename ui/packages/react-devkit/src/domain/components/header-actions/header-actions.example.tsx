import { AlarmsBellButton } from './alarms-bell-button'
import { PendingActionsButton } from './pending-actions-button'
import { ProfileMenu } from './profile-menu'

/**
 * Top-bar action cluster — the pending-actions tile (opens the ActionsSidebar),
 * the alarms bell (with severity-stacked counts), and a profile menu (here with
 * just a "Sign out" item).
 *
 * Requires MdkProvider (QueryClient + auth) higher in the tree — the
 * PendingActionsButton reads `actionsStore` and `useLiveActions` internally.
 */
export const HeaderActionsExample = (): React.ReactNode => (
  <>
    <PendingActionsButton />
    <AlarmsBellButton counts={{ critical: 171, high: 72, medium: 322 }} />
    <ProfileMenu
      user="you@example.com"
      items={[
        {
          label: 'Sign out',
          onSelect: () => console.warn('sign out'),
          danger: true,
        },
      ]}
    />
  </>
)
