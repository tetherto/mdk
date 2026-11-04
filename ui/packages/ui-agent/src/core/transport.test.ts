import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { WireEvent } from './events'
import {
  FIXTURES,
  jsonErrorResponse,
  sseResponse,
  streamErrorResponse,
} from '../test-utils/fixtures'
import { EVENT } from './events'
import {
  AGENT_ERROR,
  AgentApiError,
  createSession,
  decideApproval,
  deleteSession,
  streamTurn,
} from './transport'

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

let fetchImpl: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchImpl = vi.fn()
})

function lastCall(): [string, RequestInit] {
  return fetchImpl.mock.calls.at(-1) as [string, RequestInit]
}

describe('createSession', () => {
  it('POSTs to /agent/sessions and returns the id', async () => {
    fetchImpl.mockResolvedValue(jsonResponse({ sessionId: 'abc' }))

    await expect(createSession({ fetchImpl: fetchImpl as unknown as typeof fetch })).resolves.toBe(
      'abc',
    )
    const [url, init] = lastCall()
    expect(url).toBe('/agent/sessions')
    expect(init.method).toBe('POST')
  })

  it('uses relative URLs by default, so the dev proxy and same-origin both work', async () => {
    fetchImpl.mockResolvedValue(jsonResponse({ sessionId: 'abc' }))
    await createSession({ fetchImpl: fetchImpl as unknown as typeof fetch })
    expect(lastCall()[0].startsWith('/')).toBe(true)
  })

  it('joins an absolute base URL without doubling the slash', async () => {
    fetchImpl.mockResolvedValue(jsonResponse({ sessionId: 'abc' }))
    await createSession({
      baseUrl: 'http://127.0.0.1:3847/',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(lastCall()[0]).toBe('http://127.0.0.1:3847/agent/sessions')
  })

  it('sends a bearer token when one is available', async () => {
    fetchImpl.mockResolvedValue(jsonResponse({ sessionId: 'abc' }))
    await createSession({
      getToken: () => 'tok',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(new Headers(lastCall()[1].headers).get('authorization')).toBe('Bearer tok')
  })

  it('sends no authorization header when there is no token', async () => {
    fetchImpl.mockResolvedValue(jsonResponse({ sessionId: 'abc' }))
    await createSession({ getToken: () => null, fetchImpl: fetchImpl as unknown as typeof fetch })
    expect(new Headers(lastCall()[1].headers).has('authorization')).toBe(false)
  })

  it('strips the appended reason off ERR_AGENT_UNAVAILABLE', async () => {
    fetchImpl.mockResolvedValue(
      jsonErrorResponse(503, 'ERR_AGENT_UNAVAILABLE: config.agent missing'),
    )

    const error = await createSession({
      fetchImpl: fetchImpl as unknown as typeof fetch,
    }).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(AgentApiError)
    expect((error as AgentApiError).code).toBe(AGENT_ERROR.UNAVAILABLE)
    expect((error as AgentApiError).message).toContain('config.agent missing')
  })

  it("names the missing agent app when the gateway has no agent routes", async () => {
    // Fastify's own 404 body, which is prose rather than a code.
    fetchImpl.mockResolvedValue(
      jsonErrorResponse(404, 'Route POST:/agent/sessions not found'),
    )

    const error = await createSession({
      fetchImpl: fetchImpl as unknown as typeof fetch,
    }).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(AgentApiError)
    expect((error as AgentApiError).code).toBe(AGENT_ERROR.ROUTES_NOT_MOUNTED)
    // The server's wording stays on the message for a bug report.
    expect((error as AgentApiError).message).toBe('Route POST:/agent/sessions not found')
  })

  it('does not mistake a session 404 for missing routes', async () => {
    fetchImpl.mockResolvedValue(jsonErrorResponse(404, 'ERR_AGENT_SESSION_NOT_FOUND'))

    const error = await createSession({
      fetchImpl: fetchImpl as unknown as typeof fetch,
    }).catch((caught: unknown) => caught)

    expect((error as AgentApiError).code).toBe(AGENT_ERROR.SESSION_NOT_FOUND)
  })

  it('synthesises an ERR_-shaped code for any other status', async () => {
    fetchImpl.mockResolvedValue(jsonErrorResponse(500, 'Internal Server Error'))

    const error = await createSession({
      fetchImpl: fetchImpl as unknown as typeof fetch,
    }).catch((caught: unknown) => caught)

    expect((error as AgentApiError).code).toBe('ERR_AGENT_HTTP_500')
  })
})

describe('decideApproval', () => {
  it('POSTs the decision to the session-scoped route', async () => {
    // Not /agent/turns/:turnId/... — CONTRACT.md documents that, but the shipped
    // route is session-scoped and turnId appears in no URL.
    fetchImpl.mockResolvedValue(jsonResponse({ approvalId: 'ap', approved: true }))

    await decideApproval('sess', 'ap', true, { fetchImpl: fetchImpl as unknown as typeof fetch })

    const [url, init] = lastCall()
    expect(url).toBe('/agent/sessions/sess/approvals/ap')
    expect(JSON.parse(String(init.body))).toEqual({ approved: true })
  })

  it('sends a real boolean false for a rejection', async () => {
    fetchImpl.mockResolvedValue(jsonResponse({ approvalId: 'ap', approved: false }))
    await decideApproval('sess', 'ap', false, { fetchImpl: fetchImpl as unknown as typeof fetch })
    expect(JSON.parse(String(lastCall()[1].body))).toEqual({ approved: false })
  })

  it('surfaces a settled approval as ERR_AGENT_APPROVAL_NOT_FOUND', async () => {
    fetchImpl.mockResolvedValue(jsonErrorResponse(404, AGENT_ERROR.APPROVAL_NOT_FOUND))

    const error = await decideApproval('sess', 'ap', true, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    }).catch((caught: unknown) => caught)

    expect((error as AgentApiError).is(AGENT_ERROR.APPROVAL_NOT_FOUND)).toBe(true)
  })
})

describe('deleteSession', () => {
  it('refuses while a turn is active', async () => {
    fetchImpl.mockResolvedValue(jsonErrorResponse(409, AGENT_ERROR.TURN_ACTIVE))

    const error = await deleteSession('sess', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    }).catch((caught: unknown) => caught)

    expect((error as AgentApiError).status).toBe(409)
    expect((error as AgentApiError).is(AGENT_ERROR.TURN_ACTIVE)).toBe(true)
  })
})

describe('streamTurn', () => {
  async function collect(iterator: AsyncGenerator<WireEvent>): Promise<WireEvent[]> {
    const events: WireEvent[] = []
    for await (const event of iterator) events.push(event)
    return events
  }

  it('yields the turn events in order', async () => {
    fetchImpl.mockResolvedValue(sseResponse(FIXTURES.readCount!.events))

    const events = await collect(
      streamTurn('sess', 'How many miners are there?', {
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    )

    expect(events.map((event) => event.seq)).toEqual(FIXTURES.readCount!.events.map((e) => e.seq))
  })

  it('survives frames arriving in small chunks', async () => {
    fetchImpl.mockResolvedValue(sseResponse(FIXTURES.readList!.events, 7))

    const events = await collect(
      streamTurn('sess', 'List the miners.', { fetchImpl: fetchImpl as unknown as typeof fetch }),
    )

    expect(events).toHaveLength(FIXTURES.readList!.events.length)
  })

  it('does not fetch until the first next()', async () => {
    fetchImpl.mockResolvedValue(sseResponse(FIXTURES.readCount!.events))

    const iterator = streamTurn('sess', 'hi', { fetchImpl: fetchImpl as unknown as typeof fetch })
    expect(fetchImpl).not.toHaveBeenCalled()

    await iterator.next()
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    await iterator.return(undefined)
  })

  it('reads the ERR_ code out of the streaming route body, which has no error key', async () => {
    fetchImpl.mockResolvedValue(streamErrorResponse(409, AGENT_ERROR.TURN_ACTIVE))

    const error = await collect(
      streamTurn('sess', 'hi', { fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).catch((caught: unknown) => caught)

    expect((error as AgentApiError).is(AGENT_ERROR.TURN_ACTIVE)).toBe(true)
    expect((error as AgentApiError).status).toBe(409)
  })

  it('reports a stale session as ERR_AGENT_SESSION_NOT_FOUND so the caller can remint', async () => {
    fetchImpl.mockResolvedValue(streamErrorResponse(404, AGENT_ERROR.SESSION_NOT_FOUND))

    const error = await collect(
      streamTurn('gone', 'hi', { fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).catch((caught: unknown) => caught)

    expect((error as AgentApiError).is(AGENT_ERROR.SESSION_NOT_FOUND)).toBe(true)
  })

  it('turns a socket closed mid-turn into a terminal error', async () => {
    const truncated = FIXTURES.readCount!.events.filter((event) => event.type !== EVENT.DONE)
    fetchImpl.mockResolvedValue(sseResponse(truncated))

    const events = await collect(
      streamTurn('sess', 'hi', { fetchImpl: fetchImpl as unknown as typeof fetch }),
    )

    expect(events.at(-1)?.type).toBe(EVENT.ERROR)
  })

  it('passes the abort signal to fetch', async () => {
    fetchImpl.mockResolvedValue(sseResponse(FIXTURES.readCount!.events))
    const controller = new AbortController()

    const iterator = streamTurn('sess', 'hi', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      signal: controller.signal,
    })
    await iterator.next()

    expect(lastCall()[1].signal).toBe(controller.signal)
    await iterator.return(undefined)
  })
})
