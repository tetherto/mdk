import { createMdkQueryClient } from '@tetherto/mdk-ui-core'
import type { QueryClient } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { createContext, type FC, type ReactNode, useContext, useMemo } from 'react'

export type MdkContextValue = {
  apiBaseUrl: string
}

const MdkContext = createContext<MdkContextValue | null>(null)

export type MdkProviderProps = {
  /** Optional API base URL override (top of HLD §5 resolution chain). */
  apiBaseUrl?: string
  /** Pre-built TanStack QueryClient. Defaults to one produced by `createMdkQueryClient`. */
  queryClient?: QueryClient
  children: ReactNode
}

/**
 * Top-level provider for the MDK React adapter. Wraps `QueryClientProvider`
 * and exposes the resolved API base URL to descendants.
 *
 * @example
 * ```tsx
 * <MdkProvider apiBaseUrl="https://app-node.example.com">
 *   <App />
 * </MdkProvider>
 * ```
 */
export const MdkProvider: FC<MdkProviderProps> = ({ apiBaseUrl, queryClient, children }) => {
  const client = useMemo(
    () => queryClient ?? createMdkQueryClient({ apiBaseUrl }),
    [queryClient, apiBaseUrl],
  )

  const value = useMemo<MdkContextValue>(() => ({ apiBaseUrl: apiBaseUrl ?? '' }), [apiBaseUrl])

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
