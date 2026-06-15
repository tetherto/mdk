import { createStore } from 'zustand/vanilla'

export type TimezoneState = {
  timezone: string
}

export type TimezoneActions = {
  setTimezone: (timezone: string) => void
}

export type TimezoneStore = TimezoneState & TimezoneActions

const resolveDefaultTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/**
 * Factory for an isolated `timezoneStore` seeded from the runtime's
 * resolved IANA zone (falling back to `'UTC'`). Use this in tests; the
 * singleton {@link timezoneStore} is the right choice at runtime.
 *
 * @category timezone
 */
export const createTimezoneStore = () =>
  createStore<TimezoneStore>((set) => ({
    timezone: resolveDefaultTimezone(),
    setTimezone: (timezone) => set({ timezone }),
  }))

/**
 * Module-level singleton holding the user's currently selected IANA
 * timezone (e.g. `'America/New_York'`). Drives every timestamp renderer
 * in the UI and the `useTimezoneFormatter` adapter hook.
 *
 * @category timezone
 */
export const timezoneStore = createTimezoneStore()
