import { describe, expect, it, vi } from 'vitest'

import { createMdkQueryClient } from './client'
import {
  actionsQuery,
  appendCommaQuery,
  cancelActionsMutation,
  containerPoolStatsQuery,
  liveActionsQuery,
  minersQuery,
  poolBalanceHistoryQuery,
  poolConfigForDeviceQuery,
  poolConfigsQuery,
  poolsQuery,
  siteStatusLiveQuery,
  submitActionMutation,
  submitBatchActionMutation,
  userInfoQuery,
  voteActionMutation,
} from './pool-factories'

describe('appendCommaQuery', () => {
  it('serializes array values comma-separated', () => {
    expect(appendCommaQuery('http://x/y', { ids: ['a', 'b', 'c'] })).toBe('http://x/y?ids=a%2Cb%2Cc')
  })

  it('skips undefined, null, and empty arrays', () => {
    expect(appendCommaQuery('http://x/y', { a: undefined, b: null, c: [] })).toBe('http://x/y')
  })

  it('serializes scalars and stringifies numbers/booleans', () => {
    expect(appendCommaQuery('http://x/y', { range: '1D', limit: 50, overwriteCache: true })).toBe(
      'http://x/y?range=1D&limit=50&overwriteCache=true',
    )
  })
})

describe('pool read query factories', () => {
  const client = createMdkQueryClient({ apiBaseUrl: 'http://api.test' })

  it('poolConfigsQuery hits /auth/configs/pool', async () => {
    const fetcher = vi.fn().mockResolvedValue([])
    const def = poolConfigsQuery(client, fetcher)
    expect(def.queryKey).toEqual(['auth', 'configs', 'pool'])
    await def.queryFn()
    expect(fetcher).toHaveBeenCalledWith('http://api.test/auth/configs/pool', { signal: undefined })
  })

  it('containerPoolStatsQuery hits /auth/pools/stats/containers', async () => {
    const fetcher = vi.fn().mockResolvedValue([])
    const def = containerPoolStatsQuery(client, fetcher)
    expect(def.queryKey).toEqual(['auth', 'pools', 'stats', 'containers'])
    await def.queryFn()
    expect(fetcher).toHaveBeenCalledWith('http://api.test/auth/pools/stats/containers', {
      signal: undefined,
    })
  })

  it('poolConfigForDeviceQuery encodes the miner id', async () => {
    const fetcher = vi.fn().mockResolvedValue({})
    const def = poolConfigForDeviceQuery(client, 'miner/01', fetcher)
    expect(def.queryKey).toEqual(['auth', 'pools', 'config', 'miner/01'])
    await def.queryFn()
    expect(fetcher).toHaveBeenCalledWith('http://api.test/auth/pools/config/miner%2F01', {
      signal: undefined,
    })
  })

  it('poolsQuery hits /auth/pools', async () => {
    const fetcher = vi.fn().mockResolvedValue([])
    const def = poolsQuery(client, fetcher)
    expect(def.queryKey).toEqual(['auth', 'pools'])
    await def.queryFn()
    expect(fetcher).toHaveBeenCalledWith('http://api.test/auth/pools', { signal: undefined })
  })

  it('poolBalanceHistoryQuery encodes the pool and serializes params', async () => {
    const fetcher = vi.fn().mockResolvedValue([])
    const def = poolBalanceHistoryQuery(
      client,
      'f2pool',
      { start: 1, end: 2, range: '1W' },
      fetcher,
    )
    expect(def.queryKey).toEqual([
      'auth',
      'pools',
      'f2pool',
      'balance-history',
      { start: 1, end: 2, range: '1W' },
    ])
    await def.queryFn()
    expect(fetcher).toHaveBeenCalledWith(
      'http://api.test/auth/pools/f2pool/balance-history?start=1&end=2&range=1W',
      { signal: undefined },
    )
  })

  it('poolBalanceHistoryQuery omits the query string when params are empty', async () => {
    const fetcher = vi.fn().mockResolvedValue([])
    await poolBalanceHistoryQuery(client, 'ocean', {}, fetcher).queryFn()
    expect(fetcher).toHaveBeenCalledWith('http://api.test/auth/pools/ocean/balance-history', {
      signal: undefined,
    })
  })

  it('minersQuery passes JSON selectors through', async () => {
    const fetcher = vi.fn().mockResolvedValue({ data: [], totalCount: 0 })
    const def = minersQuery(client, { filter: '{"a":1}', limit: 10 }, fetcher)
    expect(def.queryKey[1]).toBe('miners')
    await def.queryFn()
    const calledUrl = fetcher.mock.calls[0]![0] as string
    expect(calledUrl).toContain('/auth/miners?')
    expect(calledUrl).toContain('filter=%7B%22a%22%3A1%7D')
    expect(calledUrl).toContain('limit=10')
  })

  it('actionsQuery serializes array filters comma-separated', async () => {
    const fetcher = vi.fn().mockResolvedValue([])
    const def = actionsQuery(client, { status: ['VOTING', 'APPROVED'] }, fetcher)
    expect(def.queryKey).toEqual(['auth', 'actions', { status: ['VOTING', 'APPROVED'] }])
    await def.queryFn()
    expect(fetcher).toHaveBeenCalledWith('http://api.test/auth/actions?status=VOTING%2CAPPROVED', {
      signal: undefined,
    })
  })

  it('actionsQuery hits /auth/actions with no params', async () => {
    const fetcher = vi.fn().mockResolvedValue([])
    await actionsQuery(client, {}, fetcher).queryFn()
    expect(fetcher).toHaveBeenCalledWith('http://api.test/auth/actions', { signal: undefined })
  })

  it('siteStatusLiveQuery hits /auth/site/status/live with overwriteCache', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ts: 1 })
    const def = siteStatusLiveQuery(client, fetcher)
    expect(def.queryKey).toEqual(['auth', 'site', 'status', 'live'])
    await def.queryFn()
    expect(fetcher).toHaveBeenCalledWith('http://api.test/auth/site/status/live?overwriteCache=true', {
      signal: undefined,
    })
  })

  it('userInfoQuery hits /auth/userinfo', async () => {
    const fetcher = vi.fn().mockResolvedValue({ email: 'a@b.c' })
    const def = userInfoQuery(client, fetcher)
    expect(def.queryKey).toEqual(['auth', 'userinfo'])
    await def.queryFn()
    expect(fetcher).toHaveBeenCalledWith('http://api.test/auth/userinfo', { signal: undefined })
  })

  it('liveActionsQuery serializes the default queries and overwriteCache', async () => {
    const fetcher = vi.fn().mockResolvedValue([{}])
    const def = liveActionsQuery(client, undefined, fetcher)
    await def.queryFn()
    const calledUrl = fetcher.mock.calls[0]![0] as string
    const url = new URL(calledUrl)
    expect(url.pathname).toBe('/auth/actions')
    expect(url.searchParams.get('overwriteCache')).toBe('true')
    const queries = JSON.parse(url.searchParams.get('queries') as string)
    expect(queries.map((q: { type: string }) => q.type)).toEqual([
      'voting',
      'ready',
      'executing',
      'done',
    ])
  })
})

describe('voting mutation factories', () => {
  const client = createMdkQueryClient({ apiBaseUrl: 'http://api.test' })

  it('submitActionMutation defaults the type to voting and strips it from the body', async () => {
    const fetcher = vi.fn().mockResolvedValue({ id: 1 })
    const def = submitActionMutation(client, fetcher)
    expect(def.mutationKey).toEqual(['auth', 'actions', 'submit'])
    await def.mutationFn({
      action: 'registerConfig',
      params: [{ type: 'pool', data: { poolConfigName: 'X' } }],
    })
    const [url, init] = fetcher.mock.calls[0]!
    expect(url).toBe('http://api.test/auth/actions/voting')
    expect((init as RequestInit).method).toBe('POST')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      action: 'registerConfig',
      params: [{ type: 'pool', data: { poolConfigName: 'X' } }],
    })
  })

  it('submitActionMutation always posts to the fixed voting path and strips type', async () => {
    const fetcher = vi.fn().mockResolvedValue({})
    await submitActionMutation(client, fetcher).mutationFn({ type: 'miner', action: 'reboot' })
    const [url, init] = fetcher.mock.calls[0]!
    expect(url).toBe('http://api.test/auth/actions/voting')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ action: 'reboot' })
  })

  it('submitBatchActionMutation posts the batch envelope to the /batch sub-path', async () => {
    const fetcher = vi.fn().mockResolvedValue({})
    const def = submitBatchActionMutation(client, fetcher)
    expect(def.mutationKey).toEqual(['auth', 'actions', 'submit', 'batch'])
    await def.mutationFn({
      batchActionsPayload: [{ action: 'setupPools' }],
      batchActionUID: 'uid-1',
    })
    const [url, init] = fetcher.mock.calls[0]!
    expect(url).toBe('http://api.test/auth/actions/voting/batch')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      batchActionsPayload: [{ action: 'setupPools' }],
      batchActionUID: 'uid-1',
    })
  })

  it('voteActionMutation PUTs the approve flag to the vote endpoint', async () => {
    const fetcher = vi.fn().mockResolvedValue({})
    const def = voteActionMutation(client, fetcher)
    expect(def.mutationKey).toEqual(['auth', 'actions', 'vote'])
    await def.mutationFn({ id: 'abc/1', approve: true })
    const [url, init] = fetcher.mock.calls[0]!
    expect(url).toBe('http://api.test/auth/actions/voting/abc%2F1/vote')
    expect((init as RequestInit).method).toBe('PUT')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ approve: true })
  })

  it('cancelActionsMutation DELETEs with comma-joined ids', async () => {
    const fetcher = vi.fn().mockResolvedValue({})
    const def = cancelActionsMutation(client, fetcher)
    expect(def.mutationKey).toEqual(['auth', 'actions', 'cancel'])
    await def.mutationFn({ type: 'voting', ids: ['a', 'b'] })
    const [url, init] = fetcher.mock.calls[0]!
    expect(url).toBe('http://api.test/auth/actions/voting/cancel?ids=a%2Cb')
    expect((init as RequestInit).method).toBe('DELETE')
  })
})
