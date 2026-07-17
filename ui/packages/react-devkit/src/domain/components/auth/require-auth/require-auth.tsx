import { useAuth } from '@tetherto/mdk-react-adapter'
import { type JSX, type ReactNode, useEffect } from 'react'

const LAST_PATH_STORAGE_KEY = 'mdk:last-visited-path'

const saveLastVisitedPath = (): void => {
  if (typeof window === 'undefined') return
  try {
    const next = `${window.location.pathname}${window.location.search}${window.location.hash}`
    if (next && next !== '/signin') {
      window.sessionStorage.setItem(LAST_PATH_STORAGE_KEY, next)
    }
  } catch {
    /* sessionStorage disabled — ignore */
  }
}

/**
 * Read the last-visited path stored by {@link RequireAuth}. Sign-in pages can
 * call this after a successful auth to send the user back to where they were
 * redirected from.
 *
 * @category auth
 */
export const consumeLastVisitedPath = (): string | null => {
  if (typeof window === 'undefined') return null
  try {
    const value = window.sessionStorage.getItem(LAST_PATH_STORAGE_KEY)
    if (value) window.sessionStorage.removeItem(LAST_PATH_STORAGE_KEY)
    return value
  } catch {
    return null
  }
}

export type RequireAuthProps = {
  /** Rendered when a token is present. */
  children: ReactNode
  /** Rendered when no token is present — typically `<Navigate to="/signin" />`. */
  fallback: ReactNode
  /**
   * When true (default), the current location is persisted to sessionStorage
   * before rendering the fallback so the sign-in flow can return there.
   */
  rememberPath?: boolean
}

/**
 * Route guard that reads the session token from the headless `authStore` (via
 * `useAuth`) and renders the children only when a token is present. Otherwise
 * it renders `fallback` — typically `<Navigate to="/signin" replace />` from
 * `react-router`. Router-agnostic by design.
 *
 * @category auth
 * @kernelCapability authentication
 * @domain mining-operations
 *
 * @example
 * ```tsx
 * <RequireAuth fallback={<Navigate to="/signin" replace />}>
 *   <Dashboard />
 * </RequireAuth>
 * ```
 * @tier agent-ready
 */
export const RequireAuth = ({
  children,
  fallback,
  rememberPath = true,
}: RequireAuthProps): JSX.Element => {
  const { token } = useAuth()

  useEffect(() => {
    if (!token && rememberPath) saveLastVisitedPath()
  }, [token, rememberPath])

  return token ? <>{children}</> : <>{fallback}</>
}

RequireAuth.displayName = 'RequireAuth'
