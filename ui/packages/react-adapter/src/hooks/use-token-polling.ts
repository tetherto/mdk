import { isSessionExpiredError } from '@tetherto/mdk-ui-foundation'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useMdkAuth } from '../provider/mdk-provider'

/**
 * Fallback polling interval — 250 s, for a provider that declares no cadence of
 * its own. The bundled `gatewayRedirectAuth` supplies the same value through
 * `refreshIntervalMs`.
 */
export const TOKEN_POLLING_INTERVAL_MS = 250_000

export type UseTokenPollingOptions = {
  /** Override the polling interval (ms). Useful for tests. Pass 0 to disable. */
  intervalMs?: number
  /** Pause polling — e.g. when the user is signed out. Defaults to true when a token is present. */
  enabled?: boolean
  /** Callback fired when the backend reports the session ended. */
  onSessionEnded?: () => void
}

/**
 * Keeps the session alive by calling the active `AuthProvider`'s `refresh` on an
 * interval. When a refresh reports the session ended, the provider signs out and
 * `onSessionEnded` fires so the host app can redirect to its sign-in page.
 *
 * The hook only schedules. Which endpoint gets called, how often, what counts as
 * the session ending, and where the new token is stored are all the provider's
 * decisions. A provider without `refresh` (`noAuth`, or a backend with
 * non-expiring keys) makes the hook a no-op, so it stays safe to mount
 * unconditionally.
 *
 * Reads the token through the provider rather than from React state, so it picks
 * up a token the moment `bootstrap` writes one.
 *
 * @remarks
 * The provider decides which endpoint a refresh calls, so the provider has to
 * match its backend: against an MDK stack, that is `passwordAuth`.
 * [Choosing an auth provider](https://github.com/tetherto/mdk/blob/main/ui/packages/react-adapter/README.md#authentication)
 * covers each one and the backend it expects.
 *
 * @category auth
 */
export const useTokenPolling = (options: UseTokenPollingOptions = {}): void => {
  const queryClient = useQueryClient()
  const auth = useMdkAuth()
  const { intervalMs, enabled, onSessionEnded } = options
  const period = intervalMs ?? auth.refreshIntervalMs ?? TOKEN_POLLING_INTERVAL_MS

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!auth.refresh) return
    if (period <= 0) return

    const shouldRun = enabled ?? Boolean(auth.getToken())
    if (!shouldRun) return

    const isSessionEnded = auth.isSessionEnded ?? isSessionExpiredError

    const refresh = (): void => {
      /* Re-checked per tick rather than per effect run: the session can end
       * between ticks, and there is nothing to refresh once it has. */
      if (auth.getToken() === null) return

      void auth.refresh?.(queryClient).catch((error: unknown) => {
        if (!isSessionEnded(error)) return
        auth.signOut()
        onSessionEnded?.()
      })
    }

    const id = window.setInterval(refresh, period)
    return () => {
      window.clearInterval(id)
    }
  }, [auth, enabled, period, onSessionEnded, queryClient])
}
