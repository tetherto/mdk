import { QueryClient } from '@tanstack/query-core'

const DEFAULT_API_BASE_URL = 'http://localhost:3000'

const readViteEnv = (key: string): string | undefined => {
  try {
    // `import.meta` is a syntactic form. We read it via a runtime indirection
    // so this file remains importable from CommonJS Node tooling that doesn't
    // know about it. Static analysers can't see through the indirection,
    // hence the `// eslint-disable-next-line` below.
    // eslint-disable-next-line no-new-func
    const reader = new Function('return import.meta') as () => {
      env?: Record<string, string | undefined>
    }
    return reader()?.env?.[key]
  } catch {
    return undefined
  }
}

const readNodeEnv = (key: string): string | undefined => {
  try {
    return typeof process !== 'undefined' ? process.env?.[key] : undefined
  } catch {
    return undefined
  }
}

/**
 * Resolves the App Node API base URL using the priority order described in
 * HLD §2.4 / §5:
 *
 *   1. Explicit override (caller-supplied, typically from `MdkProvider`).
 *      An explicit empty string (`''`) is honored as "use relative URLs" —
 *      the canonical signal that requests should go through a reverse proxy
 *      (e.g. the Vite dev-server proxy or a production ingress).
 *   2. Build-time env var: `VITE_MDK_API_URL` (Vite) or `MDK_API_URL` (Node).
 *   3. Hardcoded default (`http://localhost:3000`).
 *
 * @category query
 */
export const resolveApiBaseUrl = (override?: string): string => {
  if (override === '') return ''
  if (override && override.trim().length > 0) return override.trim()

  const viteEnv = readViteEnv('VITE_MDK_API_URL')
  if (viteEnv && viteEnv.trim().length > 0) return viteEnv.trim()

  const nodeEnv = readNodeEnv('MDK_API_URL')
  if (nodeEnv && nodeEnv.trim().length > 0) return nodeEnv.trim()

  return DEFAULT_API_BASE_URL
}

export type CreateMdkQueryClientOptions = {
  apiBaseUrl?: string
  /** Optional QueryClient default options pass-through. */
  defaultOptions?: ConstructorParameters<typeof QueryClient>[0] extends infer P
    ? P extends { defaultOptions?: infer D }
      ? D
      : never
    : never
}

/**
 * Build a TanStack `QueryClient` configured with the resolved API base URL.
 * The base URL is exposed via `client.getDefaultOptions().queries.meta` so
 * callers can read it without importing the `resolveApiBaseUrl` helper.
 *
 * @category query
 */
export const createMdkQueryClient = (options: CreateMdkQueryClientOptions = {}): QueryClient => {
  const baseUrl = resolveApiBaseUrl(options.apiBaseUrl)

  return new QueryClient({
    defaultOptions: {
      ...options.defaultOptions,
      queries: {
        staleTime: 30_000,
        retry: 1,
        ...options.defaultOptions?.queries,
        meta: { apiBaseUrl: baseUrl, ...options.defaultOptions?.queries?.meta },
      },
      mutations: {
        retry: 0,
        ...options.defaultOptions?.mutations,
        meta: { apiBaseUrl: baseUrl, ...options.defaultOptions?.mutations?.meta },
      },
    },
  })
}

/**
 * Read the configured base URL back from a `QueryClient` produced by
 * `createMdkQueryClient`. Falls back to the default if metadata is absent.
 *
 * @category query
 */
export const getApiBaseUrl = (client: QueryClient): string => {
  const meta = client.getDefaultOptions().queries?.meta as { apiBaseUrl?: string } | undefined
  return meta?.apiBaseUrl ?? DEFAULT_API_BASE_URL
}
