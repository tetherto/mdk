/**
 * The one stateful hook: owns the session, the live turn, and persistence.
 *
 * Components below this are presentational — they receive already-shaped props
 * and render them, per the repo's separation-of-concerns rule.
 */

import type { StoreApi } from 'zustand/vanilla'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { ChatMessage, Conversation, ConversationStore } from '../core/conversation-store'
import type { AgentTurnState, PendingApproval } from '../core/turn'
import type { AgentConfigOptions } from './use-agent-config'
import { conversationStore as defaultStore, MESSAGE_ROLE } from '../core/conversation-store'
import { ERR_OFFLINE } from '../core/error-text'
import {
  AGENT_ERROR,
  AgentApiError,
  createSession,
  decideApproval,
  deleteSession,
  streamTurn,
} from '../core/transport'
import { abortTurn, createTurnState, failTurn, isTurnSettled, reduceTurn } from '../core/turn'
import { uuid } from '../core/uuid'
import { useAgentConfig } from './use-agent-config'
import { useConversations } from './use-conversations'

/**
 * Said in the transcript when a turn had to open a new gateway session.
 *
 * Sessions live in the gateway's memory, so a restart or the agent's own TTL makes
 * a stored id a 404 and the next message starts a session with no history. The
 * transcript above it still reads as one conversation, so without this the operator
 * asks a follow-up about "that container" and the agent has never heard of it.
 */
const SESSION_RESET_NOTICE
  = 'New session — the agent does not remember the messages above this line.'

/** Nothing identified the failure. The renderer generalises it. */
const ERR_UNKNOWN = 'ERR_AGENT_UNKNOWN'

/**
 * The code to store for a turn that threw rather than ending on an `error` event.
 *
 * A code, not a sentence. `toApiError` already guarantees an `ERR_`-shaped one
 * for every reply, including those that carried none of their own, and keeping
 * it is what lets the transcript stay diagnosable and the notice decide whether
 * offering a retry is honest — a stack with no agent app and a gateway that is
 * merely busy read identically once both have been flattened to prose.
 */
function classifyError(error: unknown): string {
  if (error instanceof AgentApiError) return error.code
  // `fetch` rejects with a TypeError when the request never left the browser:
  // no connection, no DNS, no route, or the gateway refusing outright. There is
  // no status to read because it never got one.
  if (error instanceof TypeError) return ERR_OFFLINE
  return ERR_UNKNOWN
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

export type UseAgentChatOptions = AgentConfigOptions & {
  /** Isolated store for tests and the catalog demo; defaults to the singleton. */
  store?: StoreApi<ConversationStore>
  /**
   * The three silences a turn is allowed, all defaulted in `core/sse`: between
   * events, while an approval is outstanding, and before the first event. Raise
   * the second if your gateway's `agent.approvalTimeoutMs` is longer than five
   * minutes, and the third if its model is slower to route than two minutes.
   */
  idleTimeoutMs?: number
  approvalIdleTimeoutMs?: number
  firstEventIdleTimeoutMs?: number
}

export type UseAgentChatResult = {
  conversations: Conversation[]
  active: Conversation | null
  /** Persisted transcript of the active conversation. */
  messages: ChatMessage[]
  /** The turn currently streaming, rendered after `messages`. Null when idle. */
  live: AgentTurnState | null
  isStreaming: boolean
  /**
   * What the browser reports about the connection. Read to stop the panel
   * offering a retry that cannot leave the machine.
   */
  isOnline: boolean
  pendingApproval: PendingApproval | null
  /** A decision has been POSTed and the stream has not resumed yet. */
  isDecisionPending: boolean
  canSend: boolean
  send: (text: string) => void
  decide: (approved: boolean) => void
  abort: VoidFunction
  /** Re-sends the last question, for a turn that failed. */
  retry: VoidFunction
  newConversation: VoidFunction
  selectConversation: (id: string) => void
  removeConversation: (id: string) => void
}

export function useAgentChat(options: UseAgentChatOptions = {}): UseAgentChatResult {
  const {
    store = defaultStore,
    idleTimeoutMs,
    approvalIdleTimeoutMs,
    firstEventIdleTimeoutMs,
    ...configOptions
  } = options
  const config = useAgentConfig(configOptions)
  const { conversations, active, create, select, remove } = useConversations(store)

  const [live, setLive] = useState<AgentTurnState | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [decidedApprovalId, setDecidedApprovalId] = useState<string | null>(null)

  // `navigator` is absent under SSR, and a browser that never reports either
  // event leaves this true — the safe default, since the worst case is an
  // enabled button that fails the way it would have anyway.
  const [isOnline, setIsOnline] = useState(() => globalThis.navigator?.onLine ?? true)

  // Read inside async callbacks, where the rendered value would be stale.
  const liveRef = useRef<AgentTurnState | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const busyRef = useRef(false)

  const frameRef = useRef<number | null>(null)

  /**
   * Records the live turn, and commits it to React at most once per frame.
   *
   * One `setState` per SSE event means the whole panel re-renders 30–60 times a
   * second at token rate, for a transcript whose settled half never changed. The
   * ref is updated synchronously — callbacks and the next reduce read it — and the
   * scheduled commit always publishes the latest value, so no event is skipped,
   * only the intermediate paints. Clearing the turn commits immediately: it is the
   * end of the turn, not a frame of it.
   */
  const publish = useCallback((next: AgentTurnState | null) => {
    liveRef.current = next

    if (next === null) {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      frameRef.current = null
      setLive(null)
      return
    }

    if (frameRef.current !== null) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      setLive(liveRef.current)
    })
  }, [])

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      abortRef.current?.abort()
    },
    [],
  )

  useEffect(() => {
    if (typeof globalThis.addEventListener !== 'function') return
    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)
    globalThis.addEventListener('online', goOnline)
    globalThis.addEventListener('offline', goOffline)
    return () => {
      globalThis.removeEventListener('online', goOnline)
      globalThis.removeEventListener('offline', goOffline)
    }
  }, [])

  /**
   * A stored `sessionId` outlives the session it names — the gateway holds
   * sessions in memory per process, so a restart or the agent's own TTL makes it
   * a 404. `force` mints a replacement.
   */
  const resolveSessionId = useCallback(
    async (conversationId: string, force: boolean): Promise<string> => {
      const conversation = store
        .getState()
        .conversations.find((candidate) => candidate.id === conversationId)
      if (!force && conversation?.sessionId) return conversation.sessionId

      const sessionId = await createSession(config)
      store.getState().setSessionId(conversationId, sessionId)

      // Only a break if there was something to lose. A conversation whose only
      // message is the question now being sent has no context to carry over, so
      // the first session of a conversation is not announced.
      const hadContext
        = conversation?.messages.some((message) => message.role === MESSAGE_ROLE.ASSISTANT) ?? false
      if (hadContext) {
        store.getState().appendMessage(conversationId, {
          id: uuid(),
          role: MESSAGE_ROLE.SYSTEM,
          text: SESSION_RESET_NOTICE,
          at: Date.now(),
        })
      }

      return sessionId
    },
    [config, store],
  )

  /**
   * Opens the stream, retrying once against a fresh session if the stored one is
   * gone. The first `next()` is what performs the fetch — an async generator's
   * body does not run until then — so the status check happens here, not later
   * in the consume loop.
   */
  const openStream = useCallback(
    async (conversationId: string, text: string, signal: AbortSignal) => {
      const start = async (force: boolean) => {
        const sessionId = await resolveSessionId(conversationId, force)
        const iterator = streamTurn(sessionId, text, {
          ...config,
          ...(idleTimeoutMs === undefined ? {} : { idleTimeoutMs }),
          ...(approvalIdleTimeoutMs === undefined ? {} : { approvalIdleTimeoutMs }),
          ...(firstEventIdleTimeoutMs === undefined ? {} : { firstEventIdleTimeoutMs }),
          signal,
        })
        return { iterator, first: await iterator.next() }
      }

      try {
        return await start(false)
      } catch (error) {
        if (error instanceof AgentApiError && error.is(AGENT_ERROR.SESSION_NOT_FOUND)) {
          return await start(true)
        }
        throw error
      }
    },
    [approvalIdleTimeoutMs, config, firstEventIdleTimeoutMs, idleTimeoutMs, resolveSessionId],
  )

  const runTurn = useCallback(
    async (text: string) => {
      busyRef.current = true
      setIsBusy(true)
      setDecidedApprovalId(null)

      const conversationId = store.getState().activeId ?? store.getState().create()
      store.getState().appendMessage(conversationId, {
        id: uuid(),
        role: MESSAGE_ROLE.USER,
        text,
        at: Date.now(),
      })

      const controller = new AbortController()
      abortRef.current = controller

      let state = createTurnState()
      publish(state)

      try {
        const { iterator, first } = await openStream(conversationId, text, controller.signal)
        let result = first
        while (!result.done) {
          state = reduceTurn(state, result.value)
          publish(state)
          result = await iterator.next()
        }
      } catch (error) {
        // An abort is the operator's own doing: keep whatever streamed, add no
        // error. Anything else becomes the turn's error. Either way a tool call
        // still outstanding is closed — it will never report back now.
        state = isAbort(error) ? abortTurn(state) : failTurn(state, classifyError(error))
      } finally {
        // An abort cancels the reader rather than rejecting the read, so it
        // usually ends the loop normally and never reaches the catch above. The
        // closing-down a stopped turn needs therefore happens here.
        const interrupted = controller.signal.aborted && !isTurnSettled(state)
        if (interrupted) state = abortTurn(state)

        store.getState().appendMessage(conversationId, {
          id: uuid(),
          role: MESSAGE_ROLE.ASSISTANT,
          text: state.text,
          at: Date.now(),
          tools: state.tools,
          error: state.error,
          // Half an answer must not read back later as the agent's full statement.
          ...(interrupted ? { interrupted: true } : {}),
        })
        publish(null)
        abortRef.current = null
        busyRef.current = false
        setIsBusy(false)
        setDecidedApprovalId(null)
      }
    },
    [openStream, publish, store],
  )

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim()
      // Guarded on the ref rather than the rendered flag: two submits inside one
      // frame would both see the old state and provoke a 409.
      if (!text || busyRef.current) return
      void runTurn(text)
    },
    [runTurn],
  )

  const decide = useCallback(
    (approved: boolean) => {
      const pending = liveRef.current?.pendingApproval
      const conversationId = store.getState().activeId
      if (!pending || !conversationId) return
      const sessionId = store
        .getState()
        .conversations.find((conversation) => conversation.id === conversationId)?.sessionId
      if (!sessionId) return

      setDecidedApprovalId(pending.approvalId)
      void decideApproval(sessionId, pending.approvalId, approved, config).catch((error: unknown) => {
        // A 404 means the approval already settled — it timed out server-side, or
        // this is a second decision. Both are indistinguishable by design, and
        // the stream resumes either way, so there is nothing to report.
        if (error instanceof AgentApiError && error.is(AGENT_ERROR.APPROVAL_NOT_FOUND)) return
        setDecidedApprovalId(null)
      })
    },
    [config, store],
  )

  const abort = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  /**
   * Re-asks the last question after a failed turn.
   *
   * The question is re-sent as a new message rather than the failed turn being
   * resumed — the gateway has no notion of resuming one — so the transcript shows
   * it asked twice, which is what happened.
   */
  const retry = useCallback(() => {
    if (busyRef.current) return
    const conversationId = store.getState().activeId
    if (!conversationId) return

    const messages = store
      .getState()
      .conversations.find((conversation) => conversation.id === conversationId)?.messages ?? []
    const lastQuestion = [...messages].reverse().find((message) => message.role === MESSAGE_ROLE.USER)
    if (!lastQuestion) return

    void runTurn(lastQuestion.text)
  }, [runTurn, store])

  /**
   * Re-asks the question that failed for want of a connection, once the browser
   * says there is one again.
   *
   * Only that case. A turn that failed for any other reason failed for a reason
   * that coming back online does not fix, and re-sending it unprompted would be
   * the panel talking to the gateway on its own. The latch makes it one attempt
   * per offline→online transition: `retry` changes identity as the turn settles,
   * so without it this effect would re-fire against its own still-failed result.
   */
  const autoRetriedRef = useRef(false)
  useEffect(() => {
    if (!isOnline) {
      autoRetriedRef.current = false
      return
    }
    if (autoRetriedRef.current || busyRef.current) return

    const conversationId = store.getState().activeId
    if (!conversationId) return
    const messages = store
      .getState()
      .conversations.find((conversation) => conversation.id === conversationId)?.messages ?? []
    if (messages.at(-1)?.error !== ERR_OFFLINE) return

    autoRetriedRef.current = true
    retry()
  }, [isOnline, retry, store])

  /**
   * Starts a conversation, or returns to the empty one that already exists.
   *
   * Every click used to mint another row, so a handful of idle clicks filled
   * the list with identical "New conversation" entries — and because
   * `sortAndCap` trims at `MAX_CONVERSATIONS`, those empties pushed real
   * transcripts off the end, which the gateway keeps no copy of. An empty
   * conversation is indistinguishable from the one this would create, so the
   * active one is reused when it is already empty and any other empty is
   * adopted rather than joined by a second. That holds the invariant the view
   * needs: never more than one empty row.
   */
  const newConversation = useCallback(() => {
    if (busyRef.current) return

    const { conversations, activeId } = store.getState()
    const isEmpty = (conversation: Conversation) => conversation.messages.length === 0
    const reusable
      = conversations.find((conversation) => conversation.id === activeId && isEmpty(conversation))
        ?? conversations.find(isEmpty)

    if (reusable) {
      select(reusable.id)
      return
    }
    create()
  }, [create, select, store])

  const selectConversation = useCallback(
    (id: string) => {
      if (busyRef.current) return
      select(id)
    },
    [select],
  )

  /**
   * Drops the conversation locally and releases its gateway session.
   *
   * The DELETE is best-effort and deliberately unawaited: the session may
   * already be gone (a restart, or the agent's own TTL) and the gateway refuses
   * to delete one with a turn in flight. Neither should block removing the local
   * record, which is the only copy the operator can see.
   */
  const removeConversation = useCallback(
    (id: string) => {
      if (busyRef.current && store.getState().activeId === id) return

      const sessionId = store
        .getState()
        .conversations.find((conversation) => conversation.id === id)?.sessionId

      remove(id)

      if (sessionId) {
        void deleteSession(sessionId, config).catch(() => {
          // Already collected, or still busy. The gateway reaps it either way.
        })
      }
    },
    [config, remove, store],
  )

  const pendingApproval = live?.pendingApproval ?? null

  return {
    conversations,
    active,
    messages: active?.messages ?? [],
    live,
    isStreaming: isBusy,
    isOnline,
    pendingApproval,
    isDecisionPending: pendingApproval !== null && decidedApprovalId === pendingApproval.approvalId,
    // A turn paused on an approval still holds the session busy, so this stays
    // false through the approval too — sending now would be a 409.
    canSend: !isBusy,
    send,
    decide,
    abort,
    retry,
    newConversation,
    selectConversation,
    removeConversation,
  }
}
