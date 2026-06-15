import { AlarmsBellButton } from './alarms-bell-button'
import { ProfileMenu } from './profile-menu'

/**
 * Top-bar action cluster — alarms bell (with severity-stacked counts) and a
 * profile menu (here with just a "Sign out" item).
 */
export const HeaderActionsExample = (): React.ReactNode => (
  <>
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
