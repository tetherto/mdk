import { describe, expect, it, vi } from 'vitest'

import { authStore, createAuthStore } from '../store/auth-store'
import { MdkFetchError } from '../types/api-mining.types'
import { passwordAuth } from './password-auth'

type Call = { url: string; init?: RequestInit }

/** A Gateway stand-in: `/auth/*` by the cookie it holds, app routes by the bearer token. */
const gateway = (opts: { valid?: Set<string>; refreshOk?: boolean } = {}) => {
  const calls: Call[] = []
  const valid = opts.valid ?? new Set(['t1', 't2'])
  let issued = 0
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init })
    if (url.endsWith('/auth/login')) {
      const { password } = JSON.parse(String(init?.body)) as { password: string }
      return password === 'right'
        ? json(200, { tokenType: 'Bearer', accessToken: 't1', expiresIn: 600 })
        : json(401, { message: 'ERR_IDENTITY_INVALID_CREDENTIALS' })
    }
    if (url.endsWith('/auth/refresh')) {
      issued++
      return opts.refreshOk === false
        ? json(401, { message: 'ERR_AUTH_UNAUTHORIZED' })
        : json(200, { tokenType: 'Bearer', accessToken: 't2', expiresIn: 600 })
    }
    if (url.endsWith('/auth/logout')) return json(200, { revoked: true })
    const auth = new Headers(init?.headers).get('Authorization')
    const token = auth?.replace(/^Bearer /, '') ?? ''
    if (!valid.has(token)) return json(401, { message: 'ERR_AUTH_UNAUTHORIZED' })
    return url.endsWith('/auth/me')
      ? json(200, { kind: 'user', sub: 'ankit' })
      : json(200, { ok: token })
  })
  return { calls, fetchImpl: fetchImpl as unknown as typeof fetch, issued: () => issued }
}

describe('passwordAuth', () => {
  it('signs in, keeping the access token in memory and the refresh token to the cookie', async () => {
    const gw = gateway()
    const store = createAuthStore()
    const auth = passwordAuth({ baseUrl: 'http://gw/', store, fetchImpl: gw.fetchImpl })
    expect(auth.getToken()).toBeNull()

    await auth.signInWithPassword({ username: 'ankit', password: 'right' })
    expect(auth.getToken()).toBe('t1')
    expect(store.getState().token).toBe('t1')
    const login = gw.calls[0]!
    expect(login.url).toBe('http://gw/auth/login')
    expect(login.init?.credentials).toBe('include')
    expect(JSON.parse(String(login.init?.body))).toEqual({ username: 'ankit', password: 'right' })
  })

  it('rejects bad credentials with the status, leaving no session', async () => {
    const gw = gateway()
    const auth = passwordAuth({ store: createAuthStore(), fetchImpl: gw.fetchImpl })
    const err = await auth
      .signInWithPassword({ username: 'ankit', password: 'wrong' })
      .catch((e) => e)
    expect(err).toBeInstanceOf(MdkFetchError)
    expect((err as MdkFetchError).status).toBe(401)
    expect(auth.getToken()).toBeNull()
  })

  it('a 401 on a request renews once from the cookie and retries', async () => {
    const gw = gateway({ valid: new Set(['t2']) })
    const auth = passwordAuth({ store: createAuthStore(), fetchImpl: gw.fetchImpl })
    await auth.signInWithPassword({ username: 'ankit', password: 'right' })
    expect(await auth.fetcher<{ ok: string }>('/apps/demo/x')).toEqual({ ok: 't2' })
    expect(auth.getToken()).toBe('t2')
    expect(gw.issued()).toBe(1)
  })

  it('concurrent 401s share one renewal', async () => {
    const gw = gateway({ valid: new Set(['t2']) })
    const auth = passwordAuth({ store: createAuthStore(), fetchImpl: gw.fetchImpl })
    await auth.signInWithPassword({ username: 'ankit', password: 'right' })
    await Promise.all([auth.fetcher('/a'), auth.fetcher('/b'), auth.fetcher('/c')])
    expect(gw.issued()).toBe(1)
  })

  it('refreshes under a lock every tab shares', async () => {
    const gw = gateway()
    const names: string[] = []
    const locks = {
      request: async <T>(name: string, fn: () => Promise<T>) => {
        names.push(name)
        return fn()
      },
    }
    vi.stubGlobal('navigator', { ...globalThis.navigator, locks })
    try {
      const auth = passwordAuth({ store: createAuthStore(), fetchImpl: gw.fetchImpl })
      expect(await auth.refreshNow()).toBe('t2')
      expect(names).toEqual(['mdk-auth-refresh'])
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('a refresh the Gateway refuses ends the session; the request then fails as 401', async () => {
    const gw = gateway({ valid: new Set([]), refreshOk: false })
    const auth = passwordAuth({ store: createAuthStore(), fetchImpl: gw.fetchImpl })
    await auth.signInWithPassword({ username: 'ankit', password: 'right' })
    const err = await auth.fetcher('/apps/demo/x').catch((e) => e)
    expect((err as MdkFetchError).status).toBe(401)
    expect(auth.getToken()).toBeNull()
    expect(auth.isSessionEnded?.(err)).toBe(true)
  })

  it('restores a session after a reload, or reports there is none', async () => {
    const ok = passwordAuth({ store: createAuthStore(), fetchImpl: gateway().fetchImpl })
    expect(await ok.restore()).toBe(true)
    expect(ok.getToken()).toBe('t2')
    const none = passwordAuth({
      store: createAuthStore(),
      fetchImpl: gateway({ refreshOk: false }).fetchImpl,
    })
    expect(await none.restore()).toBe(false)
    const offline = passwordAuth({
      store: createAuthStore(),
      fetchImpl: (async () => {
        throw new TypeError('offline')
      }) as unknown as typeof fetch,
    })
    expect(await offline.restore()).toBe(false)
  })

  it('polls only while signed in, and signs out at the Gateway', async () => {
    const gw = gateway()
    const auth = passwordAuth({
      store: createAuthStore(),
      fetchImpl: gw.fetchImpl,
      refreshIntervalMs: 1000,
    })
    expect(auth.refreshIntervalMs).toBe(1000)
    expect(await auth.refresh?.({} as never)).toBeNull()
    expect(gw.issued()).toBe(0)
    await auth.signInWithPassword({ username: 'ankit', password: 'right' })
    expect(await auth.refresh?.({} as never)).toBe('t2')

    auth.signOut()
    expect(auth.getToken()).toBeNull()
    await vi.waitFor(() => expect(gw.calls.some((c) => c.url.endsWith('/auth/logout'))).toBe(true))
  })

  it('whoami asks the Gateway; permissions follow the token', async () => {
    const gw = gateway()
    const store = createAuthStore()
    const auth = passwordAuth({
      store,
      fetchImpl: gw.fetchImpl,
      getPermissions: (t) => ({ from: t }),
    })
    await auth.signInWithPassword({ username: 'ankit', password: 'right' })
    expect(store.getState().permissions).toEqual({ from: 't1' })
    expect(await auth.whoami()).toEqual({ kind: 'user', sub: 'ankit' })
    const other = passwordAuth({ fetchImpl: gw.fetchImpl })
    expect(other.refreshIntervalMs).toBe(240000)
    await other.signInWithPassword({ username: 'ankit', password: 'right' })
    expect(
      authStore.getState().token,
      'the shared store by default, which the React hooks read',
    ).toBe('t1')
    authStore.getState().reset()
  })
})
