import type { AuthProvider, Fetcher } from '@tetherto/mdk-ui-foundation'
import { createMdkQueryClient, gatewayRedirectAuth } from '@tetherto/mdk-ui-foundation'
import type { QueryClient } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { createContext, type FC, type ReactNode, useContext, useMemo, useRef } from 'react'

export type MdkContextValue = {
  apiBaseUrl: string
  /** How the session works. See {@link useMdkAuth}. */
  auth: AuthProvider
}

const MdkContext = createContext<MdkContextValue | null>(null)

/**
 * Fallback for auth-aware hooks rendered outside an `MdkProvider` — the
 * Gateway's redirect flow. Built once at module scope: construction has no side
 * effects, it only closes over `authStore`.
 *
 * Its `signIn` throws, because a redirect target cannot be guessed. Anything that
 * needs sign-in passes a configured provider to `MdkProvider`.
 */
const DEFAULT_AUTH: AuthProvider = gatewayRedirectAuth()

export type MdkProviderProps = {
  /**
   * Gateway base URL. Defaults to `VITE_MDK_API_URL`, then
   * `http://localhost:3000`; pass `''` for relative URLs behind a proxy.
   */
  apiBaseUrl?: string
  /**
   * How the session works: token source, sign-in, refresh, sign-out. Defaults to
   * `gatewayRedirectAuth()` minus a redirect target. Pass
   * `gatewayRedirectAuth({ oauthBaseUrl })` to enable sign-in, or `noAuth()` for
   * a Gateway running without an auth plugin.
   */
  auth?: AuthProvider
  /** Transport override, such as `passwordAuth().fetcher`. Defaults to a bearer fetcher reading from `auth`. */
  fetcher?: Fetcher
  /**
   * Fired after the session is cleared because the backend reported it ended.
   * Typically navigates to the host app's sign-in route. Forwarded to
   * `createMdkQueryClient`, which is what actually fires it.
   */
  onSessionExpired?: () => void
  /**
   * Pre-built TanStack QueryClient. Defaults to one produced by
   * `createMdkQueryClient` from `apiBaseUrl` / `auth` / `fetcher`. When supplied, those are
   * ignored for client construction — it already carries its own runtime — but
   * `auth` is still published on the context for the hooks that read it.
   */
  queryClient?: QueryClient
  children: ReactNode
}

/**
 * Top-level provider for the MDK React adapter. Wraps `QueryClientProvider` and
 * publishes the resolved API base URL and the auth provider to descendants.
 *
 * @example
 * ```tsx
 * <MdkProvider
 *   apiBaseUrl={API_BASE_URL}
 *   auth={gatewayRedirectAuth({ oauthBaseUrl: OAUTH_BASE_URL })}
 *   onSessionExpired={() => navigate('/signin')}
 * >
 *   <App />
 * </MdkProvider>
 * ```
 */
export const MdkProvider: FC<MdkProviderProps> = ({
  apiBaseUrl,
  auth,
  fetcher,
  onSessionExpired,
  queryClient,
  children,
}) => {
  const resolvedAuth = auth ?? DEFAULT_AUTH

  const client = useMemo(
    () =>
      queryClient
      ?? createMdkQueryClient({
        apiBaseUrl,
        auth: resolvedAuth,
        fetcher,
        onSessionExpired,
      }),
    // `onSessionExpired` is deliberately not a dependency: a host passing an
    // inline arrow would otherwise rebuild the QueryClient every render and drop
    // the whole cache. The client reads it through the closure it was built
    // with, so a new identity is picked up the next time the client rebuilds.
    [queryClient, apiBaseUrl, resolvedAuth, fetcher],
  )

  /* Adopt a session the environment is offering — an OAuth redirect token —
   * before anything renders against it. Idempotent and a no-op when there is
   * nothing to capture, which is why it can run unconditionally here instead of
   * being hand-rolled in every host app's entry file.
   *
   * Deliberately during render, not in an effect. An effect runs *after* the
   * children's first render, so on the OAuth return a route guard would see no
   * token, render its sign-in fallback, and — because `RequireAuth` remembers
   * where it bounced you from — persist the still-token-bearing URL to
   * sessionStorage. Capturing first avoids both the flash and writing the token
   * somewhere it was never meant to go. */
  const bootstrapped = useRef(false)
  if (!bootstrapped.current) {
    bootstrapped.current = true
    resolvedAuth.bootstrap?.()
  }

  const value = useMemo<MdkContextValue>(
    () => ({ apiBaseUrl: apiBaseUrl ?? '', auth: resolvedAuth }),
    [apiBaseUrl, resolvedAuth],
  )

  return (
    <QueryClientProvider client={client}>
      <MdkContext.Provider value={value}>{children}</MdkContext.Provider>
    </QueryClientProvider>
  )
}

/**
 * Read the `MdkContext` value. Throws when used outside an `MdkProvider`.
 * @category utility
 */
export const useMdkContext = (): MdkContextValue => {
  const ctx = useContext(MdkContext)
  if (!ctx) {
    throw new Error(
      'useMdkContext must be used inside <MdkProvider>. Wrap your app root with MdkProvider.',
    )
  }
  return ctx
}

/**
 * The active `AuthProvider`.
 *
 * Unlike `useMdkContext` this does not throw outside an `MdkProvider` — it falls
 * back to the bundled mining Gateway flow, so auth-aware hooks keep working in
 * isolation (and in existing specs) exactly as they did before the seam existed.
 *
 * @category auth
 */
export const useMdkAuth = (): AuthProvider => useContext(MdkContext)?.auth ?? DEFAULT_AUTH
