import {
  authStore,
  authTokenMutation,
  getRolesFromAuthToken,
  MdkFetchError,
} from '@tetherto/mdk-ui-core'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

/**
 * Default polling interval — 250 s, mirroring Moria's production cadence.
 * Backend token TTL defaults to 5 min (300 s) so we refresh comfortably
 * inside the window.
 */
export const TOKEN_POLLING_INTERVAL_MS = 250_000

const isSessionEnded = (err: unknown): boolean => {
  if (!(err instanceof MdkFetchError)) return false
  return err.status === 401 || err.status === 500
}

export type UseTokenPollingOptions = {
  /** Override the polling interval (ms). Useful for tests. */
  intervalMs?: number
  /** Pause polling — e.g. when the user is signed out. Defaults to true when a token is present. */
  enabled?: boolean
  /** Callback fired on 401/500. MDK UI Shell uses this to navigate back to `/signin`. */
  onSessionEnded?: () => void
}

/**
 * Periodically calls `POST /auth/token` to refresh the bearer token. On a 401
 * or 500 response the session is cleared (`authStore.reset()`) and
 * `onSessionEnded` fires so the host app can redirect to its sign-in page.
 *
 * The hook reads the token from `authStore` directly (not from React state)
 * so it picks up fresh tokens immediately after `useAuthToken` writes them.
 *
 * @category auth
 */
export const useTokenPolling = (options: UseTokenPollingOptions = {}): void => {
  const queryClient = useQueryClient()
  const { intervalMs = TOKEN_POLLING_INTERVAL_MS, enabled, onSessionEnded } = options

  const { mutate } = useMutation({
    ...authTokenMutation(queryClient),
    onSuccess: (data) => {
      if (data?.token) authStore.getState().setToken(data.token)
    },
    onError: (err) => {
      if (isSessionEnded(err)) {
        authStore.getState().reset()
        onSessionEnded?.()
      }
    },
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const shouldRun = enabled ?? Boolean(authStore.getState().token)
    if (!shouldRun) return

    const refresh = () => {
      const token = authStore.getState().token
      if (!token) return
      mutate({ roles: getRolesFromAuthToken(token) })
    }

    const id = window.setInterval(refresh, intervalMs)
    return () => {
      window.clearInterval(id)
    }
  }, [enabled, intervalMs, mutate])
}
