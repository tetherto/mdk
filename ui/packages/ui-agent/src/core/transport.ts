/**
 * The four agent routes, as declared in the `mdk-app-agent` repo's `mdk-plugin.json`.
 *
 *   POST   /agent/sessions                              -> { sessionId }
 *   POST   /agent/sessions/:id/messages                 -> text/event-stream
 *   POST   /agent/sessions/:id/approvals/:approvalId    -> { approvalId, approved }
 *   DELETE /agent/sessions/:id                          -> { sessionId, deleted }
 *
 * Note the approval route is session-scoped. `backend/core/agent/docs/CONTRACT.md`
 * documents it as `/agent/turns/{turnId}/approvals/{approvalId}`; that is stale —
 * `turnId` appears in no URL.
 *
 * The gateway sends no CORS headers, and the stream route calls `rep.hijack()` so
 * no CORS hook could decorate it even if one existed. Callers must be same-origin
 * (served from `staticRootPath`) or proxied (`/agent` in the dev server).
 */

import type { WireEvent } from './events'
import type { ReadAgentStreamOptions } from './sse'
import { readAgentStream } from './sse'

export const AGENT_ROUTE_PREFIX = '/agent'

/** The `ERR_*` codes these routes can return. */
export const AGENT_ERROR = {
  SESSION_NOT_FOUND: 'ERR_AGENT_SESSION_NOT_FOUND',
  TURN_ACTIVE: 'ERR_AGENT_TURN_ACTIVE',
  TEXT_REQUIRED: 'ERR_AGENT_MESSAGE_TEXT_REQUIRED',
  UNAVAILABLE: 'ERR_AGENT_UNAVAILABLE',
  APPROVAL_NOT_FOUND: 'ERR_AGENT_APPROVAL_NOT_FOUND',
} as const

export type AgentErrorCode = (typeof AGENT_ERROR)[keyof typeof AGENT_ERROR]

export type TokenSource = () => string | null | undefined | Promise<string | null | undefined>

export type AgentTransportOptions = {
  /** Gateway origin. Empty string means relative URLs — i.e. same-origin or proxied. */
  baseUrl?: string
  getToken?: TokenSource
  /** Injected in tests; defaults to the global `fetch`. */
  fetchImpl?: typeof fetch
}

/** A gateway error carrying the `ERR_*` code the UI branches on. */
export class AgentApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message?: string) {
    super(message ?? code)
    this.name = 'AgentApiError'
    this.status = status
    this.code = code
  }

  is(code: AgentErrorCode): boolean {
    return this.code === code
  }
}

// Trimmed with a scan rather than /\/+$/: the regex backtracks quadratically on a long run
// of trailing slashes, which CodeQL flags as a polynomial ReDoS (js/polynomial-redos).
function stripTrailingSlashes(value: string): string {
  let end = value.length
  while (end > 0 && value[end - 1] === '/') end--
  return value.slice(0, end)
}

function joinUrl(baseUrl: string | undefined, path: string): string {
  if (!baseUrl) return path
  return `${stripTrailingSlashes(baseUrl)}${path}`
}

async function buildHeaders(
  options: AgentTransportOptions,
  extra?: Record<string, string>,
): Promise<Headers> {
  const headers = new Headers(extra)
  const token = await options.getToken?.()
  if (token) headers.set('authorization', `Bearer ${token}`)
  return headers
}

/**
 * Both error body shapes, reduced to a code.
 *
 * Normal routes answer `{ statusCode, error, message }`; the streaming route
 * answers `{ statusCode, message }` with no `error` key at all. Either way the
 * `ERR_*` code is in `message`. `ERR_AGENT_UNAVAILABLE` additionally has its
 * reason concatenated in (`"ERR_AGENT_UNAVAILABLE: config.agent missing"`), so
 * the code is only the part before the colon.
 */
async function toApiError(response: Response): Promise<AgentApiError> {
  let message = response.statusText
  try {
    const body = (await response.json()) as { message?: string }
    if (typeof body?.message === 'string') message = body.message
  } catch {
    // Non-JSON body (or none). The status alone still identifies the failure.
  }
  const code = message.split(':')[0]?.trim() || `HTTP_${response.status}`
  return new AgentApiError(response.status, code, message)
}

async function requestJson<T>(
  path: string,
  init: RequestInit,
  options: AgentTransportOptions,
): Promise<T> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  const response = await fetchImpl(joinUrl(options.baseUrl, path), init)
  if (!response.ok) throw await toApiError(response)
  return (await response.json()) as T
}

/** Identity comes from the token, so the request body is ignored by the gateway. */
export async function createSession(options: AgentTransportOptions = {}): Promise<string> {
  const headers = await buildHeaders(options, { 'content-type': 'application/json' })
  const body = await requestJson<{ sessionId: string }>(
    `${AGENT_ROUTE_PREFIX}/sessions`,
    { method: 'POST', headers, body: '{}' },
    options,
  )
  return body.sessionId
}

export async function deleteSession(
  sessionId: string,
  options: AgentTransportOptions = {},
): Promise<void> {
  const headers = await buildHeaders(options)
  await requestJson(
    `${AGENT_ROUTE_PREFIX}/sessions/${encodeURIComponent(sessionId)}`,
    { method: 'DELETE', headers },
    options,
  )
}

/**
 * Answers a paused approval. The decision travels on its own request while the
 * message stream stays open — the stream resumes on its own once this lands.
 *
 * The gateway tests `approved === true`, so anything else is a rejection. It is
 * passed through as a real boolean rather than coerced, to keep that explicit.
 *
 * A decision that arrives after the approval timed out, or a second decision for
 * the same approval, is a 404 `ERR_AGENT_APPROVAL_NOT_FOUND` — the two are
 * deliberately indistinguishable. Callers should treat it as "already settled",
 * not as a failure.
 */
export async function decideApproval(
  sessionId: string,
  approvalId: string,
  approved: boolean,
  options: AgentTransportOptions = {},
): Promise<void> {
  const headers = await buildHeaders(options, { 'content-type': 'application/json' })
  await requestJson(
    `${AGENT_ROUTE_PREFIX}/sessions/${encodeURIComponent(sessionId)}`
    + `/approvals/${encodeURIComponent(approvalId)}`,
    { method: 'POST', headers, body: JSON.stringify({ approved }) },
    options,
  )
}

export type StreamTurnOptions = AgentTransportOptions & ReadAgentStreamOptions & {
  signal?: AbortSignal
}

/**
 * Sends one message and yields its events until the turn ends.
 *
 * Only one turn may be in flight per session; a second send while this is
 * running — including while it is paused on an approval, since a paused turn
 * still holds the session busy — throws `ERR_AGENT_TURN_ACTIVE`.
 */
export async function* streamTurn(
  sessionId: string,
  text: string,
  options: StreamTurnOptions = {},
): AsyncGenerator<WireEvent> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  const headers = await buildHeaders(options, {
    'content-type': 'application/json',
    'accept': 'text/event-stream',
  })

  const response = await fetchImpl(
    joinUrl(options.baseUrl, `${AGENT_ROUTE_PREFIX}/sessions/${encodeURIComponent(sessionId)}/messages`),
    { method: 'POST', headers, body: JSON.stringify({ text }), signal: options.signal },
  )

  // 404 / 409 / 400 are all raised before the SSE headers go out, so they arrive
  // as an ordinary JSON body rather than as an event on the stream.
  if (!response.ok) throw await toApiError(response)
  if (!response.body) throw new AgentApiError(response.status, 'ERR_AGENT_STREAM_EMPTY')

  yield* readAgentStream(response.body, options.signal, {
    ...(options.idleTimeoutMs === undefined ? {} : { idleTimeoutMs: options.idleTimeoutMs }),
    ...(options.approvalIdleTimeoutMs === undefined
      ? {}
      : { approvalIdleTimeoutMs: options.approvalIdleTimeoutMs }),
    ...(options.firstEventIdleTimeoutMs === undefined
      ? {}
      : { firstEventIdleTimeoutMs: options.firstEventIdleTimeoutMs }),
  })
}
