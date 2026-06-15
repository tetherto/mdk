import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createMdkQueryClient, getApiBaseUrl, resolveApiBaseUrl } from './client'

describe('resolveApiBaseUrl', () => {
  const originalNodeEnv = process.env.MDK_API_URL

  beforeEach(() => {
    delete process.env.MDK_API_URL
  })

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.MDK_API_URL
    else process.env.MDK_API_URL = originalNodeEnv
  })

  it('prefers an explicit override', () => {
    process.env.MDK_API_URL = 'http://from-env'
    expect(resolveApiBaseUrl('http://override')).toBe('http://override')
  })

  it('falls back to MDK_API_URL', () => {
    process.env.MDK_API_URL = 'http://from-env'
    expect(resolveApiBaseUrl()).toBe('http://from-env')
  })

  it('falls back to the hardcoded default', () => {
    expect(resolveApiBaseUrl()).toBe('http://localhost:3000')
  })

  it('trims whitespace from overrides', () => {
    expect(resolveApiBaseUrl('  http://x  ')).toBe('http://x')
  })

  it('ignores whitespace-only overrides', () => {
    process.env.MDK_API_URL = 'http://from-env'
    expect(resolveApiBaseUrl('   ')).toBe('http://from-env')
  })

  it('honors an explicit empty string as "use relative URLs"', () => {
    process.env.MDK_API_URL = 'http://from-env'
    expect(resolveApiBaseUrl('')).toBe('')
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

  it('getApiBaseUrl returns the default for an externally-built QueryClient', async () => {
    const { QueryClient } = await import('@tanstack/query-core')
    const plain = new QueryClient()
    expect(getApiBaseUrl(plain)).toBe('http://localhost:3000')
  })
})
