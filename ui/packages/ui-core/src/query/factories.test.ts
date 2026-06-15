import { describe, expect, it, vi } from 'vitest'
import {
  authQuery,
  authTokenMutation,
  deviceQuery,
  devicesQuery,
  historyLogQuery,
  listThingsQuery,
  tailLogQuery,
  telemetryQuery,
} from './factories'
import { createMdkQueryClient } from './client'

describe('query factories', () => {
  const client = createMdkQueryClient({ apiBaseUrl: 'http://api.test' })

  it('authQuery uses the resolved base URL', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true })
    const def = authQuery(client, fetcher)
    expect(def.queryKey).toEqual(['auth'])
    await def.queryFn()
    expect(fetcher).toHaveBeenCalledWith('http://api.test/auth')
  })

  it('devicesQuery hits /devices', async () => {
    const fetcher = vi.fn().mockResolvedValue([])
    const def = devicesQuery(client, fetcher)
    expect(def.queryKey).toEqual(['devices'])
    await def.queryFn()
    expect(fetcher).toHaveBeenCalledWith('http://api.test/devices')
  })

  it('deviceQuery encodes the id', async () => {
    const fetcher = vi.fn().mockResolvedValue({})
    const def = deviceQuery(client, 'miner/01', fetcher)
    expect(def.queryKey).toEqual(['devices', 'miner/01'])
    await def.queryFn()
    expect(fetcher).toHaveBeenCalledWith('http://api.test/devices/miner%2F01')
  })

  it('telemetryQuery encodes the id', async () => {
    const fetcher = vi.fn().mockResolvedValue([])
    const def = telemetryQuery(client, 'miner/01', fetcher)
    expect(def.queryKey).toEqual(['telemetry', 'miner/01'])
    await def.queryFn()
    expect(fetcher).toHaveBeenCalledWith('http://api.test/telemetry/miner%2F01')
  })

  it('strips trailing slashes from the base URL', async () => {
    const localClient = createMdkQueryClient({ apiBaseUrl: 'http://api.test/' })
    const fetcher = vi.fn().mockResolvedValue({})
    await authQuery(localClient, fetcher).queryFn()
    expect(fetcher).toHaveBeenCalledWith('http://api.test/auth')
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
    )
  })

  it('tailLogQuery sends only the key when other params are absent', async () => {
    const fetcher = vi.fn().mockResolvedValue([[]])
    await tailLogQuery(client, { key: 'stat-1m' }, fetcher).queryFn()
    expect(fetcher).toHaveBeenCalledWith('http://api.test/auth/tail-log?key=stat-1m')
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
    expect(fetcher).toHaveBeenCalledWith(expect.stringContaining('/auth/list-things?'))
    const calledUrl = fetcher.mock.calls[0]![0] as string
    expect(calledUrl).toContain('query=%7B%22a%22%3A1%7D')
    expect(calledUrl).toContain('fields=%7B%22b%22%3A1%7D')
    expect(calledUrl).toContain('type=miner')
  })

  it('listThingsQuery works with no params', async () => {
    const fetcher = vi.fn().mockResolvedValue([[]])
    await listThingsQuery(client, undefined, fetcher).queryFn()
    expect(fetcher).toHaveBeenCalledWith('http://api.test/auth/list-things')
  })

  it('listThingsQuery serializes a numeric `status` filter', async () => {
    const fetcher = vi.fn().mockResolvedValue([[]])
    await listThingsQuery(client, { status: 1 }, fetcher).queryFn()
    expect(fetcher).toHaveBeenCalledWith('http://api.test/auth/list-things?status=1')
  })

  it('historyLogQuery requires logType in the params', async () => {
    const fetcher = vi.fn().mockResolvedValue([])
    await historyLogQuery(client, { logType: 'alerts', limit: 100 }, fetcher).queryFn()
    expect(fetcher).toHaveBeenCalledWith(
      'http://api.test/auth/history-log?logType=alerts&limit=100',
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
