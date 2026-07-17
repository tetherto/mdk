import { cn, DropdownMenu, UserAvatarIcon } from '@primitives'
import type { JSX, ReactNode } from 'react'

export type ProfileMenuItem = {
  label: string
  onSelect: () => void
  /** Render as a destructive action (red). */
  danger?: boolean
  /** Optional leading icon. */
  icon?: ReactNode
  /** Optional secondary line under the label (e.g. "Current: Europe/Podgorica"). */
  description?: ReactNode
  /** Disable the menu item. */
  disabled?: boolean
}

export type ProfileMenuProps = {
  /** Items rendered in the dropdown, top-to-bottom. Defaults to a single "Sign out" item. */
  items: ProfileMenuItem[]
  /** Optional user label rendered at the top of the dropdown (e.g. an email). */
  user?: ReactNode
  /** Override the trigger icon — defaults to the user-avatar icon. */
  icon?: ReactNode
  /** Accessible label for the trigger button. */
  label?: string
  className?: string
}

/**
 * Top-bar profile dropdown. Wraps the core DropdownMenu primitive with the
 * user-avatar icon as the trigger. Items are caller-provided so the menu
 * surface stays application-driven.
 *
 * @category dashboard
 * @domain mining-operations
 * @tier agent-ready
 * @kernelCapability session-management
 */
export const ProfileMenu = ({
  items,
  user,
  icon,
  label = 'Profile menu',
  className,
}: ProfileMenuProps): JSX.Element => (
  <DropdownMenu.Root>
    <DropdownMenu.Trigger asChild>
      <button
        type="button"
        aria-label={label}
        className={cn('mdk-header-action-button', 'mdk-profile-menu__trigger', className)}
      >
        <span className="mdk-header-action-button__icon">{icon ?? <UserAvatarIcon />}</span>
      </button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content align="end">
      {user ? (
        <DropdownMenu.Label className="mdk-profile-menu__user">{user}</DropdownMenu.Label>
      ) : null}
      {items.map((item) => (
        <DropdownMenu.Item
          key={item.label}
          disabled={item.disabled}
          onSelect={item.onSelect}
          className={cn(
            'mdk-profile-menu__item',
            item.description ? 'mdk-profile-menu__item--two-line' : null,
            item.danger ? 'mdk-profile-menu__item--danger' : null,
          )}
        >
          {item.icon ? <span className="mdk-profile-menu__item-icon">{item.icon}</span> : null}
          <span className="mdk-profile-menu__item-body">
            <span className="mdk-profile-menu__item-label">{item.label}</span>
            {item.description ? (
              <span className="mdk-profile-menu__item-description">{item.description}</span>
            ) : null}
          </span>
        </DropdownMenu.Item>
      ))}
    </DropdownMenu.Content>
  </DropdownMenu.Root>
)

ProfileMenu.displayName = 'ProfileMenu'
