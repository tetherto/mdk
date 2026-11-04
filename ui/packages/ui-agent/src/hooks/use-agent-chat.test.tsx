import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { WireEvent } from '../core/events'
import {
  controllableStream,
  FIXTURES,
  sseResponse,
  streamErrorResponse,
} from '../test-utils/fixtures'
import { createConversationStore, MESSAGE_ROLE } from '../core/conversation-store'
import { EVENT } from '../core/events'
import { AGENT_ERROR } from '../core/transport'
import { useAgentChat } from './use-agent-chat'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function sseStreamResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  })
}

const envelope = { turnId: 'turn-1', seq: 0, ts: 0 } as const

let fetchImpl: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchImpl = vi.fn()
})

function setup(options: { idleTimeoutMs?: number } = {}) {
  const store = createConversationStore({ storage: null })
  const view = renderHook(() =>
    useAgentChat({ store, fetchImpl: fetchImpl as unknown as typeof fetch, ...options }),
  )
  return { store, ...view }
}

function urlsCalled(): string[] {
  return fetchImpl.mock.calls.map((call) => String(call[0]))
}

describe('useAgentChat — a read turn', () => {
  beforeEach(() => {
    fetchImpl.mockImplementation((url: string) =>
      Promise.resolve(
        String(url).endsWith('/messages')
          ? sseResponse(FIXTURES.readCount!.events)
          : jsonResponse({ sessionId: 'sess-1' }),
      ),
    )
  })

  it('creates a session on the first send and reuses it after', async () => {
    const { result } = setup()

    act(() => result.current.send('How many miners are there?'))
    await waitFor(() => expect(result.current.isStreaming).toBe(false))

    act(() => result.current.send('And how many are offline?'))
    await waitFor(() => expect(result.current.isStreaming).toBe(false))

    expect(urlsCalled().filter((url) => url === '/agent/sessions')).toHaveLength(1)
  })

  it('persists the operator turn and the answer', async () => {
    const { result } = setup()

    act(() => result.current.send('How many miners are there?'))
    await waitFor(() => expect(result.current.messages).toHaveLength(2))

    const [question, answer] = result.current.messages
    expect(question?.role).toBe(MESSAGE_ROLE.USER)
    expect(answer?.role).toBe(MESSAGE_ROLE.ASSISTANT)
    expect(answer?.text.length).toBeGreaterThan(0)
    expect(answer?.tools?.[0]?.name).toBe('count_devices')
  })

  it('ignores an empty message', async () => {
    const { result } = setup()
    act(() => result.current.send('   '))
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})

describe('useAgentChat — one turn at a time', () => {
  it('will not start a second turn while one is streaming', async () => {
    // A second POST would be answered with 409 ERR_AGENT_TURN_ACTIVE, so the
    // guard is here rather than in a catch.
    const live = controllableStream()
    fetchImpl.mockImplementation((url: string) =>
      Promise.resolve(
        String(url).endsWith('/messages')
          ? sseStreamResponse(live.stream)
          : jsonResponse({ sessionId: 'sess-1' }),
      ),
    )

    const { result } = setup()
    act(() => result.current.send('first'))
    await waitFor(() => expect(result.current.isStreaming).toBe(true))

    expect(result.current.canSend).toBe(false)
    act(() => result.current.send('second'))

    expect(urlsCalled().filter((url) => url.endsWith('/messages'))).toHaveLength(1)

    act(() => {
      live.push({ ...envelope, type: EVENT.DONE })
      live.close()
    })
    await waitFor(() => expect(result.current.isStreaming).toBe(false))
  })
})

describe('useAgentChat — stale session', () => {
  it('mints a fresh session and retries once when the stored one is gone', async () => {
    // Sessions live in the gateway's memory, so a restart or the agent's own TTL
    // turns a stored id into a 404. That must not surface as a failed turn.
    let sessions = 0
    let messagePosts = 0

    fetchImpl.mockImplementation((url: string) => {
      const target = String(url)
      if (target === '/agent/sessions') {
        sessions += 1
        return Promise.resolve(jsonResponse({ sessionId: `sess-${sessions}` }))
      }
      messagePosts += 1
      return Promise.resolve(
        messagePosts === 1
          ? streamErrorResponse(404, AGENT_ERROR.SESSION_NOT_FOUND)
          : sseResponse(FIXTURES.readCount!.events),
      )
    })

    const { store, result } = setup()
    const id = store.getState().create('c1', 1000)
    store.getState().setSessionId(id, 'stale-session')

    act(() => result.current.send('How many miners are there?'))
    await waitFor(() => expect(result.current.messages).toHaveLength(2))

    expect(messagePosts).toBe(2)
    expect(store.getState().conversations[0]?.sessionId).toBe('sess-1')
    expect(result.current.messages[1]?.error).toBeNull()
  })
})

describe('useAgentChat — approval', () => {
  function approvalStream() {
    const live = controllableStream()
    fetchImpl.mockImplementation((url: string) => {
      const target = String(url)
      if (target === '/agent/sessions') return Promise.resolve(jsonResponse({ sessionId: 'sess-1' }))
      if (target.endsWith('/messages')) return Promise.resolve(sseStreamResponse(live.stream))
      return Promise.resolve(jsonResponse({ approvalId: 'ap-1', approved: true }))
    })
    return live
  }

  const toolCall: WireEvent = {
    ...envelope,
    type: EVENT.TOOL_CALL,
    name: 'act_device',
    args: { ref: 'demo-miner-a-0', action: 'reboot' },
  }
  const pending: WireEvent = {
    ...envelope,
    seq: 1,
    type: EVENT.PENDING_APPROVAL,
    name: 'act_device',
    args: { ref: 'demo-miner-a-0', action: 'reboot' },
    approvalId: 'ap-1',
  }
  const resumed: WireEvent = {
    ...envelope,
    seq: 2,
    ts: 20,
    type: EVENT.TOOL_RESULT,
    name: 'act_device',
    text: 'queued',
  }

  it('exposes the pending approval and keeps the composer disabled through it', async () => {
    const live = approvalStream()
    const { result } = setup()

    act(() => result.current.send('Reboot demo-miner-a-0'))
    await waitFor(() => expect(result.current.isStreaming).toBe(true))

    act(() => {
      live.push(toolCall)
      live.push(pending)
    })
    await waitFor(() => expect(result.current.pendingApproval?.approvalId).toBe('ap-1'))

    // A paused turn still holds the session busy on the gateway.
    expect(result.current.canSend).toBe(false)

    act(() => {
      live.push(resumed)
      live.push({ ...envelope, seq: 3, ts: 30, type: EVENT.DONE, text: 'Rebooting.' })
      live.close()
    })
    await waitFor(() => expect(result.current.isStreaming).toBe(false))
  })

  it('POSTs the decision to the session-scoped approval route', async () => {
    const live = approvalStream()
    const { result } = setup()

    act(() => result.current.send('Reboot demo-miner-a-0'))
    await waitFor(() => expect(result.current.isStreaming).toBe(true))
    act(() => {
      live.push(toolCall)
      live.push(pending)
    })
    await waitFor(() => expect(result.current.pendingApproval).not.toBeNull())

    act(() => result.current.decide(true))
    await waitFor(() =>
      expect(urlsCalled()).toContain('/agent/sessions/sess-1/approvals/ap-1'),
    )
    expect(result.current.isDecisionPending).toBe(true)

    act(() => {
      live.push(resumed)
      live.push({ ...envelope, seq: 3, ts: 30, type: EVENT.DONE })
      live.close()
    })
    await waitFor(() => expect(result.current.isStreaming).toBe(false))
  })

  it('drops the prompt when the stream resumes on its own', async () => {
    // An approval nobody answers is auto-rejected after `agent.approvalTimeoutMs`
    // and the turn continues. The card has to go away then too, not only on click.
    const live = approvalStream()
    const { result } = setup()

    act(() => result.current.send('Reboot demo-miner-a-0'))
    await waitFor(() => expect(result.current.isStreaming).toBe(true))
    act(() => {
      live.push(toolCall)
      live.push(pending)
    })
    await waitFor(() => expect(result.current.pendingApproval).not.toBeNull())

    act(() => live.push(resumed))
    await waitFor(() => expect(result.current.pendingApproval).toBeNull())

    act(() => {
      live.push({ ...envelope, seq: 3, ts: 30, type: EVENT.DONE })
      live.close()
    })
    await waitFor(() => expect(result.current.isStreaming).toBe(false))
  })
})

describe('useAgentChat — failures', () => {
  it('records an error when the socket closes with no terminal event', async () => {
    const live = controllableStream()
    fetchImpl.mockImplementation((url: string) =>
      Promise.resolve(
        String(url).endsWith('/messages')
          ? sseStreamResponse(live.stream)
          : jsonResponse({ sessionId: 'sess-1' }),
      ),
    )

    const { result } = setup()
    act(() => result.current.send('hi'))
    await waitFor(() => expect(result.current.isStreaming).toBe(true))

    act(() => {
      live.push({ ...envelope, type: EVENT.TOKEN, text: 'partial' })
      live.truncate()
    })

    await waitFor(() => expect(result.current.messages).toHaveLength(2))
    expect(result.current.messages[1]?.error).toBeTruthy()
    expect(result.current.messages[1]?.text).toBe('partial')
  })

  it('stores the code a failed request carried, for the renderer to read out', async () => {
    // A code, not a sentence: the transcript keeps the diagnosable value and
    // `describeAgentError` maps it at render time, which is what lets the notice
    // decide whether offering a retry is honest.
    fetchImpl.mockResolvedValue(
      jsonResponse({ statusCode: 503, message: 'ERR_AGENT_UNAVAILABLE: config.agent missing' }, 503),
    )

    const { result } = setup()
    act(() => result.current.send('hi'))
    await waitFor(() => expect(result.current.messages).toHaveLength(2))

    expect(result.current.messages[1]?.error).toBe('ERR_AGENT_UNAVAILABLE')
  })

  it('calls a request that never left the browser offline', async () => {
    // `fetch` rejects with a TypeError when there is no connection at all —
    // there is no status to read because it never got one.
    fetchImpl.mockRejectedValue(new TypeError('Failed to fetch'))

    const { result } = setup()
    act(() => result.current.send('hi'))
    await waitFor(() => expect(result.current.messages).toHaveLength(2))

    expect(result.current.messages[1]?.error).toBe('ERR_AGENT_OFFLINE')
  })

  it('gives up on a socket that stays open but stops delivering', async () => {
    // The gateway sends no heartbeats, so a wedged agent looks exactly like one
    // still thinking — and the awaited `next()` parks forever. Since `busyRef`
    // gates the composer and every conversation action, that deadlocks the whole
    // panel until the page is reloaded.
    const live = controllableStream()
    fetchImpl.mockImplementation((url: string) =>
      Promise.resolve(
        String(url).endsWith('/messages')
          ? sseStreamResponse(live.stream)
          : jsonResponse({ sessionId: 'sess-1' }),
      ),
    )

    const { result } = setup({ idleTimeoutMs: 30 })
    act(() => result.current.send('hi'))
    await waitFor(() => expect(result.current.isStreaming).toBe(true))

    act(() => live.push({ ...envelope, type: EVENT.TOKEN, text: 'thinking' }))
    await waitFor(() => expect(result.current.messages).toHaveLength(2))

    expect(result.current.isStreaming).toBe(false)
    expect(result.current.canSend).toBe(true)
    expect(result.current.messages[1]?.error).toBe('ERR_AGENT_STREAM_IDLE')
  })

  it('closes a tool step the turn never got a result for', async () => {
    const live = controllableStream()
    fetchImpl.mockImplementation((url: string) =>
      Promise.resolve(
        String(url).endsWith('/messages')
          ? sseStreamResponse(live.stream)
          : jsonResponse({ sessionId: 'sess-1' }),
      ),
    )

    const { result } = setup()
    act(() => result.current.send('Reboot demo-miner-a-0'))
    await waitFor(() => expect(result.current.isStreaming).toBe(true))

    act(() => {
      live.push({ ...envelope, type: EVENT.TOOL_CALL, name: 'act_device', args: {} })
      live.truncate()
    })
    await waitFor(() => expect(result.current.messages).toHaveLength(2))

    // A step persisted as `running` reads back as a turn still in flight.
    expect(result.current.messages[1]?.tools?.[0]?.status).toBe('interrupted')
  })

  it('keeps what streamed when the operator aborts, with no error', async () => {
    const live = controllableStream()
    fetchImpl.mockImplementation((url: string) =>
      Promise.resolve(
        String(url).endsWith('/messages')
          ? sseStreamResponse(live.stream)
          : jsonResponse({ sessionId: 'sess-1' }),
      ),
    )

    const { result } = setup()
    act(() => result.current.send('hi'))
    await waitFor(() => expect(result.current.isStreaming).toBe(true))

    act(() => live.push({ ...envelope, type: EVENT.TOKEN, text: 'half an ans' }))
    await waitFor(() => expect(result.current.live?.text).toBe('half an ans'))

    act(() => result.current.abort())
    await waitFor(() => expect(result.current.messages).toHaveLength(2))

    expect(result.current.messages[1]?.text).toBe('half an ans')
    expect(result.current.messages[1]?.error).toBeNull()
    // Half an answer must not read back later as the agent's full statement.
    expect(result.current.messages[1]?.interrupted).toBe(true)
  })

  it('closes a tool step the operator stopped the turn on top of', async () => {
    // Aborting cancels the reader rather than rejecting the read, so the turn ends
    // through the normal path and the step has to be closed there too.
    const live = controllableStream()
    fetchImpl.mockImplementation((url: string) =>
      Promise.resolve(
        String(url).endsWith('/messages')
          ? sseStreamResponse(live.stream)
          : jsonResponse({ sessionId: 'sess-1' }),
      ),
    )

    const { result } = setup()
    act(() => result.current.send('Reboot demo-miner-a-0'))
    await waitFor(() => expect(result.current.isStreaming).toBe(true))

    act(() => live.push({ ...envelope, type: EVENT.TOOL_CALL, name: 'act_device', args: {} }))
    await waitFor(() => expect(result.current.live?.tools).toHaveLength(1))

    act(() => result.current.abort())
    await waitFor(() => expect(result.current.messages).toHaveLength(2))

    expect(result.current.messages[1]?.tools?.[0]?.status).toBe('interrupted')
    expect(result.current.messages[1]?.interrupted).toBe(true)
  })

  it('re-asks the last question on retry', async () => {
    fetchImpl.mockImplementation((url: string) =>
      Promise.resolve(
        String(url).endsWith('/messages')
          ? sseResponse(FIXTURES.readCount!.events)
          : jsonResponse({ sessionId: 'sess-1' }),
      ),
    )

    const { result } = setup()
    act(() => result.current.send('How many miners are there?'))
    await waitFor(() => expect(result.current.messages).toHaveLength(2))

    act(() => result.current.retry())
    await waitFor(() => expect(result.current.messages).toHaveLength(4))

    // Re-sent as a new message, because the gateway has no notion of resuming one.
    expect(result.current.messages[2]?.text).toBe('How many miners are there?')
  })
})

describe('useAgentChat — a re-minted session', () => {
  it('says in the transcript that the agent has forgotten the earlier messages', async () => {
    // The transcript keeps rendering continuity the new session does not have, so a
    // follow-up about "that container from before" silently means nothing.
    let sessions = 0
    let messagePosts = 0

    fetchImpl.mockImplementation((url: string) => {
      const target = String(url)
      if (target === '/agent/sessions') {
        sessions += 1
        return Promise.resolve(jsonResponse({ sessionId: `sess-${sessions}` }))
      }
      messagePosts += 1
      return Promise.resolve(
        messagePosts === 2
          ? streamErrorResponse(404, AGENT_ERROR.SESSION_NOT_FOUND)
          : sseResponse(FIXTURES.readCount!.events),
      )
    })

    const { result } = setup()

    act(() => result.current.send('How many miners are there?'))
    await waitFor(() => expect(result.current.messages).toHaveLength(2))

    act(() => result.current.send('And how many are offline?'))
    await waitFor(() => expect(result.current.messages).toHaveLength(5))

    const notice = result.current.messages.find(
      (message) => message.role === MESSAGE_ROLE.SYSTEM,
    )
    expect(notice?.text).toMatch(/does not remember/)
  })

  it('says nothing on the first session of a conversation, where nothing was lost', async () => {
    fetchImpl.mockImplementation((url: string) =>
      Promise.resolve(
        String(url).endsWith('/messages')
          ? sseResponse(FIXTURES.readCount!.events)
          : jsonResponse({ sessionId: 'sess-1' }),
      ),
    )

    const { result } = setup()
    act(() => result.current.send('How many miners are there?'))
    await waitFor(() => expect(result.current.messages).toHaveLength(2))

    expect(result.current.messages.some((message) => message.role === MESSAGE_ROLE.SYSTEM)).toBe(false)
  })
})

describe('useAgentChat — removing a conversation', () => {
  beforeEach(() => {
    fetchImpl.mockImplementation((url: string) =>
      Promise.resolve(
        String(url).endsWith('/messages')
          ? sseResponse(FIXTURES.readCount!.events)
          : jsonResponse({ sessionId: 'sess-1' }),
      ),
    )
  })

  it('drops the transcript and releases the gateway session', async () => {
    const { store, result } = setup()

    act(() => result.current.send('How many miners are there?'))
    await waitFor(() => expect(result.current.messages).toHaveLength(2))
    const id = store.getState().activeId!

    act(() => result.current.removeConversation(id))

    expect(store.getState().conversations).toHaveLength(0)
    await waitFor(() =>
      expect(fetchImpl.mock.calls.some(
        (call) => String(call[0]) === '/agent/sessions/sess-1' && (call[1] as RequestInit)?.method === 'DELETE',
      )).toBe(true),
    )
  })

  it('still removes it locally when the gateway refuses the delete', async () => {
    // The session may already be collected, or the gateway may refuse because a
    // turn is running. Neither should strand a row the operator cannot clear.
    const { store, result } = setup()
    act(() => result.current.send('How many miners are there?'))
    await waitFor(() => expect(result.current.messages).toHaveLength(2))
    const id = store.getState().activeId!

    fetchImpl.mockResolvedValue(jsonResponse({ statusCode: 409, message: 'ERR_AGENT_TURN_ACTIVE' }, 409))
    act(() => result.current.removeConversation(id))

    expect(store.getState().conversations).toHaveLength(0)
  })

  it('does not send a DELETE for a conversation that never opened a session', async () => {
    const { store, result } = setup()
    const id = store.getState().create('local-only', 1000)

    act(() => result.current.removeConversation(id))

    expect(store.getState().conversations).toHaveLength(0)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('refuses to remove the conversation whose turn is streaming', async () => {
    const live = controllableStream()
    fetchImpl.mockImplementation((url: string) =>
      Promise.resolve(
        String(url).endsWith('/messages')
          ? sseStreamResponse(live.stream)
          : jsonResponse({ sessionId: 'sess-1' }),
      ),
    )

    const { store, result } = setup()
    act(() => result.current.send('hi'))
    await waitFor(() => expect(result.current.isStreaming).toBe(true))
    const id = store.getState().activeId!

    act(() => result.current.removeConversation(id))
    expect(store.getState().conversations).toHaveLength(1)

    act(() => {
      live.push({ ...envelope, type: EVENT.DONE, text: 'ok' })
      live.close()
    })
    await waitFor(() => expect(result.current.isStreaming).toBe(false))
  })
})

describe('useAgentChat — conversations', () => {
  it('will not switch conversation mid-turn', async () => {
    const live = controllableStream()
    fetchImpl.mockImplementation((url: string) =>
      Promise.resolve(
        String(url).endsWith('/messages')
          ? sseStreamResponse(live.stream)
          : jsonResponse({ sessionId: 'sess-1' }),
      ),
    )

    const { store, result } = setup()
    store.getState().create('other', 500)
    act(() => result.current.send('hi'))
    await waitFor(() => expect(result.current.isStreaming).toBe(true))

    const activeDuringTurn = result.current.active?.id
    act(() => result.current.selectConversation('other'))
    expect(result.current.active?.id).toBe(activeDuringTurn)

    act(() => result.current.newConversation())
    expect(result.current.active?.id).toBe(activeDuringTurn)

    act(() => {
      live.push({ ...envelope, type: EVENT.DONE, text: 'ok' })
      live.close()
    })
    await waitFor(() => expect(result.current.isStreaming).toBe(false))
  })
})

describe('useAgentChat — starting a conversation', () => {
  it('reuses the empty conversation instead of minting a second', () => {
    // Every click used to add another "New conversation" row, and since the
    // store trims at MAX_CONVERSATIONS those empties pushed real transcripts
    // off the end — which the gateway keeps no copy of.
    const { result } = setup()

    act(() => result.current.newConversation())
    act(() => result.current.newConversation())
    act(() => result.current.newConversation())

    expect(result.current.conversations).toHaveLength(1)
    expect(result.current.conversations[0]?.messages).toHaveLength(0)
  })

  it('starts a fresh one once the current conversation has something in it', async () => {
    fetchImpl.mockImplementation((url: string) =>
      Promise.resolve(
        String(url).endsWith('/messages')
          ? sseResponse(FIXTURES.readCount!.events)
          : jsonResponse({ sessionId: 'sess-1' }),
      ),
    )
    const { result } = setup()

    act(() => result.current.send('hi'))
    await waitFor(() => expect(result.current.messages.length).toBeGreaterThan(0))

    act(() => result.current.newConversation())

    expect(result.current.conversations).toHaveLength(2)
    expect(result.current.active?.messages).toHaveLength(0)
  })

  it('adopts an empty conversation left behind elsewhere in the list', async () => {
    // Make one, type in it, make another, then go back to the first: the second
    // is now empty but no longer active. Starting a third must take that one
    // rather than leave two empties in the list.
    fetchImpl.mockImplementation((url: string) =>
      Promise.resolve(
        String(url).endsWith('/messages')
          ? sseResponse(FIXTURES.readCount!.events)
          : jsonResponse({ sessionId: 'sess-1' }),
      ),
    )
    const { result } = setup()

    act(() => result.current.send('hi'))
    await waitFor(() => expect(result.current.messages.length).toBeGreaterThan(0))
    const withMessages = result.current.active?.id as string

    act(() => result.current.newConversation())
    act(() => result.current.selectConversation(withMessages))
    act(() => result.current.newConversation())

    expect(result.current.conversations.filter((c) => c.messages.length === 0)).toHaveLength(1)
  })
})
