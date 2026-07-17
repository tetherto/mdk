import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authStore } from '../store/auth-store'
import { MdkFetchError } from '../types/api-mining.types'
import { createBearerFetcher } from './mdk-fetch'

const okJson = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const errResponse = (status: number, body?: unknown): Response =>
  new Response(JSON.stringify(body ?? { error: 'nope' }), {
    status,
    statusText: status === 401 ? 'Unauthorized' : 'Error',
    headers: { 'content-type': 'application/json' },
  })

describe('createBearerFetcher', () => {
  beforeEach(() => {
    authStore.getState().reset()
  })

  afterEach(() => {
    authStore.getState().reset()
  })

  it('injects the Bearer header from authStore', async () => {
    authStore.getState().setToken('tok-123')
    const fetchImpl = vi.fn(async () => okJson({ ok: true }))
    const fetcher = createBearerFetcher({ fetchImpl })

    const result = await fetcher<{ ok: boolean }>('http://api/test')

    expect(result).toEqual({ ok: true })
    expect(fetchImpl).toHaveBeenCalledOnce()
    const [, init] = fetchImpl.mock.calls[0]!
    const headers = init?.headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer tok-123')
  })

  it('omits the Bearer header when no token is set', async () => {
    const fetchImpl = vi.fn(async () => okJson({ ok: true }))
    const fetcher = createBearerFetcher({ fetchImpl })

    await fetcher('http://api/test')

    const [, init] = fetchImpl.mock.calls[0]!
    const headers = init?.headers as Headers
    expect(headers.get('Authorization')).toBeNull()
  })

  it('reads the token at call time, not construction time', async () => {
    const fetchImpl = vi.fn(async () => okJson({ ok: true }))
    const fetcher = createBearerFetcher({ fetchImpl })

    authStore.getState().setToken('first')
    await fetcher('http://api/test')
    authStore.getState().setToken('second')
    await fetcher('http://api/test')

    const firstHeaders = fetchImpl.mock.calls[0]![1]!.headers as Headers
    const secondHeaders = fetchImpl.mock.calls[1]![1]!.headers as Headers
    expect(firstHeaders.get('Authorization')).toBe('Bearer first')
    expect(secondHeaders.get('Authorization')).toBe('Bearer second')
  })

  it('throws MdkFetchError with the parsed body on non-2xx', async () => {
    const fetchImpl = vi.fn(async () => errResponse(401, { error: 'invalid' }))
    const fetcher = createBearerFetcher({ fetchImpl })

    await expect(fetcher('http://api/test')).rejects.toMatchObject({
      name: 'MdkFetchError',
      status: 401,
      body: { error: 'invalid' },
    })
  })

  it('returns undefined for 204 No Content', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }))
    const fetcher = createBearerFetcher({ fetchImpl })
    await expect(fetcher('http://api/test')).resolves.toBeUndefined()
  })

  it('honours a custom token getter', async () => {
    const fetchImpl = vi.fn(async () => okJson({}))
    const fetcher = createBearerFetcher({ fetchImpl, getToken: () => 'custom' })
    await fetcher('http://api/test')
    const headers = fetchImpl.mock.calls[0]![1]!.headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer custom')
  })

  it('MdkFetchError carries the status code', () => {
    const err = new MdkFetchError(500, 'kaboom')
    expect(err.status).toBe(500)
    expect(err.name).toBe('MdkFetchError')
  })
})
