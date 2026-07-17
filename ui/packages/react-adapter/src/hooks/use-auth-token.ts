import { authStore, extractAuthTokenFromUrl, stripAuthTokenFromUrl } from '@tetherto/mdk-ui-foundation'
import { useEffect } from 'react'
import { useStore } from 'zustand'

/**
 * Reads `?authToken=…` from `window.location.search`, persists it into the
 * headless `authStore`, and strips the parameter from the URL via
 * `history.replaceState` so the token never lingers in the address bar.
 *
 * Router-agnostic by design — pair with any client-side router (or none).
 * The hook returns the *current* token from the store so callers can react to
 * it (e.g. to redirect to `/dashboard`).
 *
 * @example
 * ```tsx
 * const App = () => {
 *   const token = useAuthToken()
 *   return token ? <Outlet/> : <Navigate to="/signin" replace />
 * }
 * ```
 * @category auth
 */
export const useAuthToken = (): string | null => {
  const token = useStore(authStore, (s) => s.token)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const candidate = extractAuthTokenFromUrl(window.location.search)
    if (!candidate) return
    if (candidate === authStore.getState().token) return

    authStore.getState().setToken(candidate)

    const cleanedSearch = stripAuthTokenFromUrl(window.location.search)
    const next = `${window.location.pathname}${cleanedSearch}${window.location.hash}`
    window.history.replaceState(window.history.state, '', next)
  }, [])

  return token
}
