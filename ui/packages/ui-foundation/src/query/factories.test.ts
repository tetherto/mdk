import { describe, expect, it, vi } from 'vitest'
import {
  addThingCommentMutation,
  authQuery,
  authTokenMutation,
  containerSettingsQuery,
  deleteThingCommentMutation,
  deviceQuery,
  devicesQuery,
  editThingCommentMutation,
  featureConfigQuery,
  globalConfigQuery,
  globalDataQuery,
  historyLogQuery,
  listRacksQuery,
  listThingsQuery,
  pduLayoutQuery,
  siteQuery,
  tailLogMultiQuery,
  tailLogQuery,
  telemetryQuery,
  thingConfigQuery,
} from './factories'
import { createMdkQueryClient } from './client'

describe('query factories', () => {
  const client = createMdkQueryClient({ apiBaseUrl: 'http://api.test' })

  it('authQuery uses the resolved base URL', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true })
    const def = authQuery(client, fetcher)
    expect(def.queryKey).toEqual(['auth'])
    await def.queryFn()
    expect(fetcher).toHaveBeenCalledWith('http://api.test/auth', { signal: undefined })
  })

  it('devicesQuery hits /devices', async () => {
    const fetcher = vi.fn().mockResolvedValue([])
    const def = devicesQuery(client, fetcher)
    expect(def.queryKey).toEqual(['devices'])
    await def.queryFn()
    expect(fetcher).toHaveBeenCalledWith('http://api.test/devices', { signal: undefined })
  })

  it('deviceQuery encodes the id', async () => {
    const fetcher = vi.fn().mockResolvedValue({})
    const def = deviceQuery(client, 'miner/01', fetcher)
    expect(def.queryKey).toEqual(['devices', 'miner/01'])
    await def.queryFn()
    expect(fetcher).toHaveBeenCalledWith('http://api.test/devices/miner%2F01', {
      signal: undefined,
    })
  })

  it('telemetryQuery encodes the id', async () => {
    const fetcher = vi.fn().mockResolvedValue([])
    const def = telemetryQuery(client, 'miner/01', fetcher)
    expect(def.queryKey).toEqual(['telemetry', 'miner/01'])
    await def.queryFn()
    expect(fetcher).toHaveBeenCalledWith('http://api.test/telemetry/miner%2F01', {
      signal: undefined,
    })
  })

  it('strips trailing slashes from the base URL', async () => {
    const localClient = createMdkQueryClient({ apiBaseUrl: 'http://api.test/' })
    const fetcher = vi.fn().mockResolvedValue({})
    await authQuery(localClient, fetcher).queryFn()
    expect(fetcher).toHaveBeenCalledWith('http://api.test/auth', { signal: undefined })
  })

  it('threads the TanStack abort signal into the fetcher', async () => {
    const fetcher = vi.fn().mockResolvedValue({})
    const controller = new AbortController()
    await authQuery(client, fetcher).queryFn({ signal: controller.signal })
    expect(fetcher).toHaveBeenCalledWith('http://api.test/auth', { signal: controller.signal })
  })
})

describe('mining query factories', () => {
  const client = createMdkQueryClient({ apiBaseUrl: 'http://api.test' })

  it('tailLogQuery serialises params into the query string', async () => {
    const fetcher = vi.fn().mockResolvedValue([[{ ts: 1 }]])
    const def = tailLogQuery(
      client,
      { key: 'stat-1m', type: 'miner', tag: 't-miner', aggrFields: '{"x":1}', limit: 50 },
      fetcher,
    )
    expect(def.queryKey).toEqual([
      'auth',
      'tail-log',
      { key: 'stat-1m', type: 'miner', tag: 't-miner', aggrFields: '{"x":1}', limit: 50 },
    ])
    await def.queryFn()
    expect(fetcher).toHaveBeenCalledWith(
      'http://api.test/auth/tail-log?key=stat-1m&type=miner&tag=t-miner&aggrFields=%7B%22x%22%3A1%7D&limit=50',
      { signal: undefined },
    )
  })

  it('tailLogQuery sends only the key when other params are absent', async () => {
    const fetcher = vi.fn().mockResolvedValue([[]])
    await tailLogQuery(client, { key: 'stat-1m' }, fetcher).queryFn()
    expect(fetcher).toHaveBeenCalledWith('http://api.test/auth/tail-log?key=stat-1m', {
      signal: undefined,
    })
  })

  it('listThingsQuery passes query+fields strings unchanged', async () => {
    const fetcher = vi.fn().mockResolvedValue([[]])
    const def = listThingsQuery(
      client,
      { query: '{"a":1}', fields: '{"b":1}', type: 'miner' },
      fetcher,
    )
    expect(def.queryKey[0]).toBe('auth')
    expect(def.queryKey[1]).toBe('list-things')
    await def.queryFn()
    expect(fetcher).toHaveBeenCalledWith(expect.stringContaining('/auth/list-things?'), {
      signal: undefined,
    })
    const calledUrl = fetcher.mock.calls[0]![0] as string
    expect(calledUrl).toContain('query=%7B%22a%22%3A1%7D')
    expect(calledUrl).toContain('fields=%7B%22b%22%3A1%7D')
    expect(calledUrl).toContain('type=miner')
  })

  it('listThingsQuery works with no params', async () => {
    const fetcher = vi.fn().mockResolvedValue([[]])
    await listThingsQuery(client, undefined, fetcher).queryFn()
    expect(fetcher).toHaveBeenCalledWith('http://api.test/auth/list-things', { signal: undefined })
  })

  it('listThingsQuery serializes a numeric `status` filter', async () => {
    const fetcher = vi.fn().mockResolvedValue([[]])
    await listThingsQuery(client, { status: 1 }, fetcher).queryFn()
    expect(fetcher).toHaveBeenCalledWith('http://api.test/auth/list-things?status=1', {
      signal: undefined,
    })
  })

  it('historyLogQuery requires logType in the params', async () => {
    const fetcher = vi.fn().mockResolvedValue([])
    await historyLogQuery(client, { logType: 'alerts', limit: 100 }, fetcher).queryFn()
    expect(fetcher).toHaveBeenCalledWith(
      'http://api.test/auth/history-log?logType=alerts&limit=100',
      { signal: undefined },
    )
  })

  it('authTokenMutation POSTs to /auth/token with the body', async () => {
    const fetcher = vi.fn().mockResolvedValue({ token: 'fresh' })
    const def = authTokenMutation(client, fetcher)
    expect(def.mutationKey).toEqual(['auth', 'token'])
    const result = await def.mutationFn({ roles: ['admin'] })
    expect(result).toEqual({ token: 'fresh' })
    expect(fetcher).toHaveBeenCalledWith(
      'http://api.test/auth/token',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ roles: ['admin'] }),
      }),
    )
  })

  it('authTokenMutation defaults to an empty body', async () => {
    const fetcher = vi.fn().mockResolvedValue({ token: 'x' })
    await authTokenMutation(client, fetcher).mutationFn()
    const [, init] = fetcher.mock.calls[0]!
    expect((init as RequestInit).body).toBe('{}')
  })
})

describe('operational centre query factories', () => {
  const client = createMdkQueryClient({ apiBaseUrl: 'http://api.test' })

  it('tailLogMultiQuery serialises the batched params', async () => {
    const fetcher = vi.fn().mockResolvedValue([[]])
    const def = tailLogMultiQuery(client, { keys: 'stat-1m,stat-5m', limit: 10 }, fetcher)
    expect(def.queryKey).toEqual(['auth', 'tail-log', 'multi', { keys: 'stat-1m,stat-5m', limit: 10 }])
    await def.queryFn()
    expect(fetcher).toHaveBeenCalledWith(
      'http://api.test/auth/tail-log/multi?keys=stat-1m%2Cstat-5m&limit=10',
      { signal: undefined },
    )
  })

  it('siteQuery hits /auth/site', async () => {
    const fetcher = vi.fn().mockResolvedValue({ site: 'Site A' })
    const def = siteQuery(client, fetcher)
    expect(def.queryKey).toEqual(['auth', 'site'])
    await expect(def.queryFn()).resolves.toEqual({ site: 'Site A' })
    expect(fetcher).toHaveBeenCalledWith('http://api.test/auth/site', { signal: undefined })
  })

  it('listRacksQuery requires the worker type param', async () => {
    const fetcher = vi.fn().mockResolvedValue([[]])
    const def = listRacksQuery(client, { type: 'miner' }, fetcher)
    expect(def.queryKey).toEqual(['auth', 'list-racks', { type: 'miner' }])
    await def.queryFn()
    expect(fetcher).toHaveBeenCalledWith('http://api.test/auth/list-racks?type=miner', {
      signal: undefined,
    })
  })

  it('pduLayoutQuery passes the container type', async () => {
    const fetcher = vi.fn().mockResolvedValue({ type: 'container-bd-d40-m56', layout: [] })
    const def = pduLayoutQuery(client, { type: 'container-bd-d40-m56' }, fetcher)
    expect(def.queryKey).toEqual(['auth', 'pdu-layout', { type: 'container-bd-d40-m56' }])
    await def.queryFn()
    expect(fetcher).toHaveBeenCalledWith('http://api.test/auth/pdu-layout?type=container-bd-d40-m56', {
      signal: undefined,
    })
  })

  it('globalDataQuery serialises the data-set selector', async () => {
    const fetcher = vi.fn().mockResolvedValue([])
    const def = globalDataQuery(client, { type: 'siteEnergy', overwriteCache: true }, fetcher)
    expect(def.queryKey).toEqual(['auth', 'global', 'data', { type: 'siteEnergy', overwriteCache: true }])
    await def.queryFn()
    expect(fetcher).toHaveBeenCalledWith(
      'http://api.test/auth/global/data?type=siteEnergy&overwriteCache=true',
      { signal: undefined },
    )
  })

  it('containerSettingsQuery pins type=containerSettings and forwards the model', async () => {
    const fetcher = vi.fn().mockResolvedValue([{ model: 'container-bd-d40-m56' }])
    const def = containerSettingsQuery(client, { model: 'bd' }, fetcher)
    expect(def.queryKey).toEqual([
      'auth',
      'global',
      'data',
      { type: 'containerSettings', model: 'bd' },
    ])
    await def.queryFn()
    expect(fetcher).toHaveBeenCalledWith(
      'http://api.test/auth/global/data?type=containerSettings&model=bd',
      { signal: undefined },
    )
  })

  it('thingConfigQuery passes both required params', async () => {
    const fetcher = vi.fn().mockResolvedValue({})
    const def = thingConfigQuery(client, { type: 'container-bd-d40-m56', requestType: 'settings' }, fetcher)
    expect(def.queryKey).toEqual([
      'auth',
      'thing-config',
      { type: 'container-bd-d40-m56', requestType: 'settings' },
    ])
    await def.queryFn()
    expect(fetcher).toHaveBeenCalledWith(
      'http://api.test/auth/thing-config?type=container-bd-d40-m56&requestType=settings',
      { signal: undefined },
    )
  })

  it('globalConfigQuery hits /auth/global-config', async () => {
    const fetcher = vi.fn().mockResolvedValue({})
    const def = globalConfigQuery(client, fetcher)
    expect(def.queryKey).toEqual(['auth', 'global-config'])
    await def.queryFn()
    expect(fetcher).toHaveBeenCalledWith('http://api.test/auth/global-config', { signal: undefined })
  })

  it('featureConfigQuery uses the camelCase route', async () => {
    const fetcher = vi.fn().mockResolvedValue({ containerCharts: true })
    const def = featureConfigQuery(client, fetcher)
    expect(def.queryKey).toEqual(['auth', 'featureConfig'])
    await expect(def.queryFn()).resolves.toEqual({ containerCharts: true })
    expect(fetcher).toHaveBeenCalledWith('http://api.test/auth/featureConfig', { signal: undefined })
  })
})

describe('thing comment mutations', () => {
  const client = createMdkQueryClient({ apiBaseUrl: 'http://api.test' })
  const body = { rackId: 'rack-0', thingId: 'miner-1', comment: 'psu replaced' }

  it('addThingCommentMutation POSTs the comment body', async () => {
    const fetcher = vi.fn().mockResolvedValue({})
    const def = addThingCommentMutation(client, fetcher)
    expect(def.mutationKey).toEqual(['auth', 'thing', 'comment', 'add'])
    await def.mutationFn(body)
    expect(fetcher).toHaveBeenCalledWith(
      'http://api.test/auth/thing/comment',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(body) }),
    )
  })

  it('editThingCommentMutation PUTs with the comment id', async () => {
    const fetcher = vi.fn().mockResolvedValue({})
    const def = editThingCommentMutation(client, fetcher)
    expect(def.mutationKey).toEqual(['auth', 'thing', 'comment', 'edit'])
    await def.mutationFn({ ...body, id: 'comment-7', ts: 1751000000000 })
    expect(fetcher).toHaveBeenCalledWith(
      'http://api.test/auth/thing/comment',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ ...body, id: 'comment-7', ts: 1751000000000 }),
      }),
    )
  })

  it('deleteThingCommentMutation DELETEs with the full body', async () => {
    const fetcher = vi.fn().mockResolvedValue({})
    const def = deleteThingCommentMutation(client, fetcher)
    expect(def.mutationKey).toEqual(['auth', 'thing', 'comment', 'delete'])
    await def.mutationFn({ ...body, id: 'comment-7' })
    expect(fetcher).toHaveBeenCalledWith(
      'http://api.test/auth/thing/comment',
      expect.objectContaining({ method: 'DELETE', body: JSON.stringify({ ...body, id: 'comment-7' }) }),
    )
  })
})
