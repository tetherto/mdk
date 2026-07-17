import { useAuth, useTimezone } from '@tetherto/mdk-react-adapter'
import {
  Dialog,
  DialogContent,
  ProfileMenu,
  SignOutIcon,
  UserAvatarIcon,
} from '@tetherto/mdk-react-devkit'
import { authStore, getRolesFromAuthToken } from '@tetherto/mdk-ui-foundation'
import { useMemo, useState } from 'react'

const SUPPORTED_TIMEZONES: string[] = (() => {
  const intlAny = Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
  try {
    const values = intlAny.supportedValuesOf?.('timeZone')
    if (Array.isArray(values) && values.length > 0) return values
  } catch {
    // fall through
  }
  return [
    'UTC',
    'Europe/London',
    'Europe/Berlin',
    'America/New_York',
    'America/Los_Angeles',
    'Asia/Tokyo',
  ]
})()

const formatRoleLabel = (role: string | undefined): string => {
  if (role === undefined || role === '') return 'User'
  if (role === '*') return 'Administrator'
  return role
    .split('_')
    .map((part) => (part.length > 0 ? part[0]!.toUpperCase() + part.slice(1) : part))
    .join(' ')
}

// Inline clock glyph for the Change Timezone row — kept local to avoid
// committing a new shared icon for a single one-off use.
const ClockIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.25" />
    <path d="M8 4.5V8L10.5 9.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
  </svg>
)

interface UserMenuProps {
  onSignOut: () => void
}

export const UserMenu = ({ onSignOut }: UserMenuProps) => {
  const { token } = useAuth()
  const { timezone, setTimezone } = useTimezone()
  const [tzDialogOpen, setTzDialogOpen] = useState(false)

  const roleLabel = useMemo(() => {
    const roles = getRolesFromAuthToken(token ?? undefined)
    return formatRoleLabel(roles[0])
  }, [token])

  return (
    <>
      <ProfileMenu
        items={[
          {
            label: roleLabel,
            icon: <UserAvatarIcon />,
            onSelect: () => {
              // Info row — no action. ProfileMenu's `disabled` would make
              // the row look greyed-out; we want it readable but inert.
            },
          },
          {
            label: 'Change Timezone',
            description: timezone,
            icon: <ClockIcon />,
            onSelect: () => setTzDialogOpen(true),
          },
          {
            label: 'Sign Out',
            icon: <SignOutIcon />,
            onSelect: () => {
              authStore.getState().reset()
              onSignOut()
            },
            danger: true,
          },
        ]}
      />
      <Dialog open={tzDialogOpen} onOpenChange={setTzDialogOpen}>
        <DialogContent title="Change Timezone" closable bare>
          <div className="mdk-ui-shell-tz-dialog">
            <label className="mdk-ui-shell-tz-dialog__label" htmlFor="mdk-ui-shell-tz-select">
              Display all times in:
            </label>
            <select
              id="mdk-ui-shell-tz-select"
              className="mdk-ui-shell-tz-dialog__select"
              value={timezone}
              onChange={(event) => {
                setTimezone(event.target.value)
                setTzDialogOpen(false)
              }}
            >
              {SUPPORTED_TIMEZONES.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
