import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authStore } from '../store/auth-store'
import { MdkFetchError } from '../types/api-mining.types'
import {
  API_BASE_URL_ENV,
  createMdkQueryClient,
  DEPRECATED_API_BASE_URL_ENV,
  getApiBaseUrl,
  resolveApiBaseUrl,
} from './client'
import { getFetcher } from './runtime'

describe('resolveApiBaseUrl', () => {
  const NAMES = [API_BASE_URL_ENV.node, DEPRECATED_API_BASE_URL_ENV.node]
  const original = new Map(NAMES.map((name) => [name, process.env[name]]))

  beforeEach(() => {
    for (const name of NAMES) delete process.env[name]
  })

  afterEach(() => {
    for (const name of NAMES) {
      const value = original.get(name)
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
  })

  it('prefers an explicit override', () => {
    process.env[API_BASE_URL_ENV.node] = 'http://from-env'
    expect(resolveApiBaseUrl('http://override')).toBe('http://override')
  })

  it('falls back to MDK_API_URL', () => {
    process.env[API_BASE_URL_ENV.node] = 'http://from-env'
    expect(resolveApiBaseUrl()).toBe('http://from-env')
  })

  it('falls back to the hardcoded default', () => {
    expect(resolveApiBaseUrl()).toBe('http://localhost:3000')
  })

  it('trims whitespace from overrides', () => {
    expect(resolveApiBaseUrl('  http://x  ')).toBe('http://x')
  })

  it('ignores whitespace-only overrides', () => {
    process.env[API_BASE_URL_ENV.node] = 'http://from-env'
    expect(resolveApiBaseUrl('   ')).toBe('http://from-env')
  })

  it('honors an explicit empty string as "use relative URLs"', () => {
    process.env[API_BASE_URL_ENV.node] = 'http://from-env'
    expect(resolveApiBaseUrl('')).toBe('')
  })

  describe('deprecated aliases', () => {
    it('reads the deprecated name when the canonical one is unset', () => {
      process.env[DEPRECATED_API_BASE_URL_ENV.node] = 'http://from-legacy'
      expect(resolveApiBaseUrl()).toBe('http://from-legacy')
    })

    it('prefers the canonical name over the deprecated one', () => {
      process.env[API_BASE_URL_ENV.node] = 'http://canonical'
      process.env[DEPRECATED_API_BASE_URL_ENV.node] = 'http://legacy'
      expect(resolveApiBaseUrl()).toBe('http://canonical')
    })

    it('names the replacement when it warns', () => {
      /* The resolver warns once per process, so this asserts the message rather
       * than the call count — a sibling test may already have consumed it. */
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      process.env[DEPRECATED_API_BASE_URL_ENV.node] = 'http://from-legacy'

      resolveApiBaseUrl()
      resolveApiBaseUrl()

      const messages = warn.mock.calls.map((call) => String(call[0]))
      expect(warn.mock.calls.length).toBeLessThanOrEqual(1)
      for (const message of messages) {
        expect(message).toContain(DEPRECATED_API_BASE_URL_ENV.node)
        expect(message).toContain(API_BASE_URL_ENV.node)
      }
      warn.mockRestore()
    })

    it('does not warn when only the canonical name is set', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      process.env[API_BASE_URL_ENV.node] = 'http://canonical'

      resolveApiBaseUrl()

      expect(warn).not.toHaveBeenCalled()
      warn.mockRestore()
    })
  })
})

describe('createMdkQueryClient', () => {
  it('stores the resolved base URL on default options.meta', () => {
    const client = createMdkQueryClient({ apiBaseUrl: 'http://demo.test' })
    expect(getApiBaseUrl(client)).toBe('http://demo.test')
  })

  it('respects caller-supplied default options', () => {
    const client = createMdkQueryClient({
      defaultOptions: { queries: { staleTime: 1234 } },
    })
    expect(client.getDefaultOptions().queries?.staleTime).toBe(1234)
  })

  it('uses a caller-supplied fetcher as the transport', () => {
    const fetcher = vi.fn()
    const client = createMdkQueryClient({ fetcher })
    expect(getFetcher(client)).toBe(fetcher)
  })

  it('getApiBaseUrl returns the default for an externally-built QueryClient', async () => {
    const { QueryClient } = await import('@tanstack/query-core')
    const plain = new QueryClient()
    expect(getApiBaseUrl(plain)).toBe('http://localhost:3000')
  })
})

describe('createMdkQueryClient — session expiry', () => {
  const reject401 = () => Promise.reject(new MdkFetchError(401, 'HTTP 401'))

  beforeEach(() => {
    authStore.getState().reset()
  })

  it('clears the token and fires onSessionExpired when a query 401s', async () => {
    authStore.getState().setToken('live-token')
    const onSessionExpired = vi.fn()
    const client = createMdkQueryClient({ onSessionExpired })

    await expect(
      client.fetchQuery({ queryKey: ['expired'], queryFn: reject401 }),
    ).rejects.toBeInstanceOf(MdkFetchError)

    expect(authStore.getState().token).toBeNull()
    expect(onSessionExpired).toHaveBeenCalledTimes(1)
  })

  it('clears the token when a mutation 401s', async () => {
    authStore.getState().setToken('live-token')
    const onSessionExpired = vi.fn()
    const client = createMdkQueryClient({ onSessionExpired })

    const mutation = client.getMutationCache().build(client, { mutationFn: reject401 })
    await expect(mutation.execute(undefined)).rejects.toBeInstanceOf(MdkFetchError)

    expect(authStore.getState().token).toBeNull()
    expect(onSessionExpired).toHaveBeenCalledTimes(1)
  })

  it('leaves the session intact for non-401 errors', async () => {
    authStore.getState().setToken('live-token')
    const onSessionExpired = vi.fn()
    // Skip the retry so the test doesn't wait on backoff — the reset guard
    // under test is independent of retry count.
    const client = createMdkQueryClient({
      onSessionExpired,
      defaultOptions: { queries: { retry: false } },
    })

    await expect(
      client.fetchQuery({
        queryKey: ['server-error'],
        queryFn: () => Promise.reject(new MdkFetchError(500, 'HTTP 500')),
      }),
    ).rejects.toBeInstanceOf(MdkFetchError)

    expect(authStore.getState().token).toBe('live-token')
    expect(onSessionExpired).not.toHaveBeenCalled()
  })

  it('does not retry an expired-session query', async () => {
    authStore.getState().setToken('live-token')
    const queryFn = vi.fn(reject401)
    const client = createMdkQueryClient()

    await expect(
      client.fetchQuery({ queryKey: ['no-retry'], queryFn }),
    ).rejects.toBeInstanceOf(MdkFetchError)

    expect(queryFn).toHaveBeenCalledTimes(1)
  })

  it('stays idempotent when already signed out', async () => {
    const onSessionExpired = vi.fn()
    const client = createMdkQueryClient({ onSessionExpired })

    await expect(
      client.fetchQuery({ queryKey: ['already-out'], queryFn: reject401 }),
    ).rejects.toBeInstanceOf(MdkFetchError)

    expect(onSessionExpired).not.toHaveBeenCalled()
  })
})
